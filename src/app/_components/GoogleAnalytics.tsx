// import { env } from '@/env'
// import Script from 'next/script'

// interface GoogleAnalyticsProps {
//     userId?: string | null
// }

// export function GoogleAnalytics({ userId }: GoogleAnalyticsProps) {
//     return (
//         <>
//             <Script
//                 src={`https://www.googletagmanager.com/gtag/js?id=${env.GA_ID}`}
//                 strategy="afterInteractive"
//             />
//             <Script id="google-analytics" strategy="afterInteractive">
//                 {`
//                 window.dataLayer = window.dataLayer || [];
//                 function gtag(){dataLayer.push(arguments);}
//                 gtag('js', new Date());

//                 ${userId ? `gtag('set', 'user_id', '${userId}');` : ''}

//                 gtag('config', '${env.GA_ID}', { 'debug_mode': true });
//             `}
//             </Script>
//         </>
//     )
// }
