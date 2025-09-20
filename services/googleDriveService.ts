import { GOOGLE_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_DRIVE_SCOPE } from '../config';
import { LibraryItem, MediaType } from '../types';

// Type definitions for Google APIs
declare global {
    interface Window {
        gapi: any;
        google: any;
        tokenClient: any;
    }
}

export { GOOGLE_CLIENT_ID };


/**
 * Initializes the GAPI client, waiting for the gapi script to be loaded by index.html.
 * This function polls for the `gapi` object and then initializes the client library.
 */
export const initGapiClient = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const poll = setInterval(() => {
            if (window.gapi && window.gapi.load) {
                clearInterval(poll);
                // Load only the 'client' library for Drive API calls.
                // The 'picker' library will be loaded on-demand.
                window.gapi.load('client', {
                    callback: () => {
                        window.gapi.client.init({
                            apiKey: GOOGLE_API_KEY,
                            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                        }).then(
                            () => resolve(),
                            (error: any) => {
                                console.error("GAPI client initialization failed", error);
                                reject(error);
                            }
                        );
                    },
                    onerror: (error: any) => {
                        console.error("GAPI library loading failed", error);
                        reject(new Error("Failed to load GAPI client library."));
                    },
                });
            }
        }, 100);

        // Add a timeout to prevent the polling from running indefinitely
        setTimeout(() => {
            clearInterval(poll);
            if (!window.gapi || !window.gapi.load) {
                reject(new Error("Google API script failed to load in a reasonable time."));
            }
        }, 10000);
    });
};


/**
 * Shows the Google Picker UI for folder selection.
 * This is now an internal function called after a token is successfully acquired and the picker library is loaded.
 */
const showPicker = (callback: (doc: any) => void) => {
    const accessToken = window.gapi.client.getToken().access_token;
    if (!accessToken) {
        console.error("Cannot show picker: No access token available.");
        return;
    }
    const view = new window.google.picker.View(window.google.picker.ViewId.FOLDERS);
    view.setMimeTypes("application/vnd.google-apps.folder");

    const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setAppId(GOOGLE_CLIENT_ID.split('-')[0])
        .setOAuthToken(accessToken)
        .addView(view)
        .setCallback((data: any) => {
            if (data.action === window.google.picker.Action.PICKED) {
                const doc = data.docs[0];
                callback(doc);
            }
        })
        .build();
    picker.setVisible(true);
};

/**
 * Initializes a token client, requests an access token, loads the picker library, and then shows the picker.
 * This entire flow is triggered by a user action (e.g., a button click) to prevent popup blockers.
 * @param pickerCallback The function to call when a folder has been picked.
 * @param errorCallback The function to call if token authorization fails.
 */
export const getAccessTokenAndShowPicker = (
    pickerCallback: (doc: any) => void,
    errorCallback: (error: any) => void
) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_DRIVE_SCOPE,
        callback: (tokenResponse: any) => {
            if (tokenResponse.error) {
                console.error('Token error:', tokenResponse);
                errorCallback(new Error(tokenResponse.error_description || 'Unknown authorization error.'));
                return;
            }
            // A token has been acquired. Now, load the picker library and then show the picker.
            window.gapi.load('picker', () => {
                showPicker(pickerCallback);
            });
        },
    });
    // Request the access token. This will open a popup if consent is needed.
    tokenClient.requestAccessToken({ prompt: 'consent' });
};


const getMediaType = (mimeType: string): MediaType => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('document') || mimeType.includes('pdf') || mimeType.includes('text')) return 'document';
    return 'other';
};

/**
 * Lists files from a specified Google Drive folder.
 */
export const listDriveFiles = async (folderId: string): Promise<LibraryItem[]> => {
    try {
        const response = await window.gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType, webViewLink, iconLink, thumbnailLink, description)',
            pageSize: 200,
        });

        return response.result.files.map((file: any) => ({
            id: file.id,
            type: getMediaType(file.mimeType),
            title: file.name,
            description: file.description || '',
            tags: [],
            url: file.thumbnailLink || file.iconLink, // Use thumbnail for images, fallback to icon
            source: 'drive',
            webViewLink: file.webViewLink,
            iconLink: file.iconLink,
        }));
    } catch (error) {
        console.error('Error fetching drive files:', error);
        throw error;
    }
};