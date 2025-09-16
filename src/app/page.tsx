import { LogoutButton } from './logout-button'
import { CertificateEmissionsList } from './CertificateEmissionsList'
import { TemplatesList } from './TemplatesList'

export default function Home() {
    return (
        <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
            <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
                <LogoutButton />
                {/* <Image
                    src='https://lh3.googleusercontent.com/drive-storage/AJQWtBOcfkrsHBdP3a2Nmx86XlPhUkpwYGzANDEKTIr7Pz1ZZrk_Hm_7t9ZlKk5axZAhB6Cbi9LLC3JJ4SUyw1CO-x3sQq01jEVlsO4RGqw1g9uvuww=s220'
                    alt="Miniatura do template"
                    width={180}
                    height={38}
                    // priority
                /> */}
                {/* <TemplatesList /> */}
                <CertificateEmissionsList />
            </main>
        </div>
    )
}
