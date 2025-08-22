import { OAuth2Client } from "google-auth-library";

const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
    // process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
);

export async function POST(request: Request) {
    const { code } = await request.json()

    const { tokens } = await oAuth2Client.getToken(code);
    
    console.log('Tokens received:', tokens);

    const ticket = await oAuth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload()

    console.log('Payload:', payload)

    // oAuth2Client.setCredentials(tokens);
}