import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client';
import { Storage } from '@google-cloud/storage';
import { PrismaPg } from '@prisma/adapter-pg';
import path from 'path';

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'nome-do-seu-bucket-aqui';
const DRY_RUN = true; // <--- Mude para false APENAS quando tiver certeza

const connectionString = `${process.env.DB_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const storage = new Storage()

async function main() {
  console.log(`\n🚀 Iniciando migração de arquivos (GCP)`);
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`🛡️ Modo DRY RUN: ${DRY_RUN ? 'ATIVADO (Nenhum arquivo será movido)' : 'DESATIVADO (Alterações reais!!)'}\n`);

  const bucket = storage.bucket(BUCKET_NAME);

  // 1. Get rows that need migration
  const rowsToMigrate = await prisma.dataSourceRow.findMany({
    where: {
      legacy_file_index: { not: null }, // Only get rows that were marked by the migration SQL
    },
    // We need the user id to move the file to the correct user folder
    include: {
        DataSource: {
            include: {
                CertificateEmission: {
                    include: {
                        User: true
                    }
                }
            }
        }
    }
  });

  console.log(`🔍 Encontrados ${rowsToMigrate.length} registros para processar.\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const row of rowsToMigrate) {
    // Security validation to avoid breaking the loop
    if (!row.DataSource?.CertificateEmission?.User) {
      console.warn(`⚠️ Row ${row.id} ignored: DataSource/CertificateEmission/User not found.`);
      skippedCount++;
      continue;
    }

    const userId = row.DataSource?.CertificateEmission?.User?.id; 
    const emissionId = row.DataSource?.CertificateEmission?.id; // ou row.dataSource.id
    const oldIndex = row.legacy_file_index; // The number that came from the SQL (1, 2, 3...)
    const newId = row.id; // The new UUID

    // 2. Build the paths
    // ATTENTION: Verify if your 'oldIndex' needs +1 or not.
    // If the SQL used WITH ORDINALITY starting from 1, and the file was 'certificate-1', use it directly.
    // If the file was 'certificate-0' (unlikely), subtract 1.
    const oldPath = `users/${userId}/certificates/${emissionId}/certificate-${oldIndex}.pdf`;
    const newPath = `users/${userId}/certificates/${emissionId}/${newId}.pdf`;

    try {
      if (DRY_RUN) {
        console.log(`[DRY-RUN] Would rename: \n   From: ${oldPath} \n   To: ${newPath}`);
        successCount++;
      } else {
        // --- Real action ---
        
        const oldFile = bucket.file(oldPath);
        const newFile = bucket.file(newPath);

        // Verify if the old file exists
        const [exists] = await oldFile.exists();
        
        if (!exists) {
          // Try to see if the NEW file already exists (partial migration)
          const [newExists] = await newFile.exists();
          if (newExists) {
            console.log(`ℹ️ File already migrated: ${newId}`);
            // Optional: Clear the legacy index here as well
          } else {
            console.warn(`❌ Original file not found in bucket: ${oldPath}`);
            errorCount++;
          }
          continue;
        }

        // On GCP, "rename" makes a copy and deletes the original atomically (if possible)
        await oldFile.rename(newPath);
        
        console.log(`✅ Renamed: .../${path.basename(oldPath)} -> .../${newId}.pdf`);
        
        // 3. Clean up the database (Remove the legacy_index to not process again)
        await prisma.dataSourceRow.update({
          where: { id: row.id },
          data: { legacy_file_index: null }
        });

        successCount++;
      }
    } catch (error) {
      console.error(`🚨 Error processing ${row.id}:`, error);
      errorCount++;
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