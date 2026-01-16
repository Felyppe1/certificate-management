import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client';
import { Storage } from '@google-cloud/storage';
import { PrismaPg } from '@prisma/adapter-pg';

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'nome-do-seu-bucket-aqui';
const DRY_RUN = true; // <--- Mude para false APENAS quando tiver certeza

const connectionString = `${process.env.DB_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const storage = new Storage()

const MIME_TYPE_TO_FILE_EXTENSION: Record<string, string> = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.google-apps.document': 'docx',
    'application/vnd.google-apps.presentation': 'pptx',
}

async function downloadFromDrive(driveFileId: string, fileExtension: string): Promise<Buffer> {
    let url = ''

    switch (fileExtension) {
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/vnd.google-apps.document':
            url = `https://docs.google.com/document/d/${driveFileId}/export?format=docx`
            break
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        case 'application/vnd.google-apps.presentation':
            url = `https://docs.google.com/presentation/d/${driveFileId}/export?format=pptx`
            break
        default:
            throw new Error(`Unsupported file extension for download: ${fileExtension}`)
    }

    const res = await fetch(url)

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Error downloading file from Google Drive (${res.status}): ${text.substring(0, 200)}`)
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    return buffer
}

async function main() {
    console.log(`\n🚀 Iniciando migração de templates para o bucket`);
    console.log(`📦 Bucket: ${BUCKET_NAME}`);
    console.log(`🛡️ Modo DRY RUN: ${DRY_RUN ? 'ATIVADO (Nenhum arquivo será migrado)' : 'DESATIVADO (Alterações reais!!)'}\n`);

    const bucket = storage.bucket(BUCKET_NAME);

    // 1. Get templates that need migration (URL or GOOGLE_DRIVE without storageFileUrl)
    const templatesToMigrate = await prisma.template.findMany({
        where: {
            storage_file_url: null,
            drive_file_id: { not: null },
            input_method: { in: ['URL', 'GOOGLE_DRIVE'] },
        },
        include: {
            CertificateEmission: {
                include: {
                    User: true,
                },
            },
        },
    });

    console.log(`🔍 Encontrados ${templatesToMigrate.length} templates para processar.\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const template of templatesToMigrate) {
        if (!template.CertificateEmission?.User) {
            console.warn(`⚠️ Template ${template.certificate_emission_id} ignored: CertificateEmission/User not found.`);
            skippedCount++;
            continue;
        }

        if (!template.drive_file_id) {
            console.warn(`⚠️ Template ${template.certificate_emission_id} ignored: drive_file_id is null.`);
            skippedCount++;
            continue;
        }

        const userId = template.CertificateEmission.User.id;
        const emissionId = template.certificate_emission_id;
        const driveFileId = template.drive_file_id;
        const fileExtension = template.file_extension;
        const ext = MIME_TYPE_TO_FILE_EXTENSION[fileExtension];

        if (!ext) {
            console.warn(`⚠️ Template ${emissionId} ignored: unsupported file extension ${fileExtension}.`);
            skippedCount++;
            continue;
        }

        const storagePath = `users/${userId}/certificates/${emissionId}/template.${ext}`;

        try {
            if (DRY_RUN) {
                console.log(`[DRY-RUN] Would download from Drive and upload to: ${storagePath}`);
                console.log(`   Drive File ID: ${driveFileId}`);
                console.log(`   File Extension: ${fileExtension}`);
                successCount++;
            } else {
                console.log(`📥 Downloading template ${emissionId} from Drive...`);
                
                const buffer = await downloadFromDrive(driveFileId, fileExtension);
                
                console.log(`   Downloaded ${buffer.length} bytes`);

                // Upload to bucket
                const file = bucket.file(storagePath);
                await file.save(buffer, {
                    metadata: {
                        contentType: fileExtension,
                    },
                });

                console.log(`📤 Uploaded to: ${storagePath}`);

                // Update database
                await prisma.template.update({
                    where: { certificate_emission_id: emissionId },
                    data: { storage_file_url: storagePath },
                });

                console.log(`✅ Template ${emissionId} migrated successfully!`);
                successCount++;
            }
        } catch (error) {
            console.error(`🚨 Error processing template ${emissionId}:`, error);
            errorCount++;
        }

        // Add a small delay to avoid rate limiting from Google Drive
        if (!DRY_RUN) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log('\n--- Final Summary ---');
    console.log(`✅ Success: ${successCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
