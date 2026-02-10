
import { PublicClientApplication, Configuration, AuthenticationResult } from "@azure/msal-browser";

// --- CONFIGURATION ---
// IMPORTANT: You must register an app in Azure Portal (App Registrations)
// 1. New Registration -> Name: "FrotaPro" -> Accounts in any organizational directory and personal Microsoft accounts.
// 2. Redirect URI (SPA): http://localhost:5173 (or your production URL)
// 3. Copy Application (client) ID below.
const CLIENT_ID = "YOUR_CLIENT_ID_HERE_REPLACE_ME"; // <--- REPLACE THIS

const msalConfig: Configuration = {
    auth: {
        clientId: CLIENT_ID,
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin, // Auto-detects localhost or production domain
    },
    cache: {
        cacheLocation: "localStorage", 
    }
};

const loginRequest = {
    scopes: ["User.Read", "Files.ReadWrite.All"] // Scopes for Profile and OneDrive
};

// Singleton Instance
let msalInstance: PublicClientApplication | null = null;

export const microsoftGraph = {
    
    initialize: async () => {
        if (!msalInstance) {
            msalInstance = new PublicClientApplication(msalConfig);
            await msalInstance.initialize();
        }
        return msalInstance;
    },

    login: async (): Promise<AuthenticationResult> => {
        const msal = await microsoftGraph.initialize();
        try {
            const response = await msal.loginPopup(loginRequest);
            return response;
        } catch (e) {
            console.error("Microsoft Login Failed", e);
            throw e;
        }
    },

    logout: async () => {
        const msal = await microsoftGraph.initialize();
        const account = msal.getAllAccounts()[0];
        if (account) {
            await msal.logoutPopup({ account });
        }
    },

    getAccount: async () => {
        const msal = await microsoftGraph.initialize();
        const accounts = msal.getAllAccounts();
        return accounts.length > 0 ? accounts[0] : null;
    },

    getToken: async (): Promise<string> => {
        const msal = await microsoftGraph.initialize();
        const account = msal.getAllAccounts()[0];
        
        if (!account) throw new Error("User not signed in to Microsoft.");

        try {
            const response = await msal.acquireTokenSilent({
                ...loginRequest,
                account: account
            });
            return response.accessToken;
        } catch (e) {
            // Fallback to popup if silent fails (e.g. expired session)
            const response = await msal.acquireTokenPopup(loginRequest);
            return response.accessToken;
        }
    },

    uploadFileToOneDrive: async (blob: Blob, filename: string): Promise<void> => {
        try {
            const accessToken = await microsoftGraph.getToken();
            
            // 1. Create Folder 'FROTAPRO_BACKUPS' if not exists (Lazy approach: Just upload to path)
            // OneDrive API allows uploading directly to a path.
            
            const folder = 'FROTAPRO_BACKUPS';
            const path = `/${folder}/${filename}`;
            const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${path}:/content`;

            const response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/zip', // Assuming ZIP
                },
                body: blob
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || "OneDrive Upload Failed");
            }
        } catch (e) {
            console.error("OneDrive Upload Error:", e);
            throw e;
        }
    }
};
