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
 * This function polls for the `gapi` object and then initializes the client.
 */
export const initGapiClient = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const poll = setInterval(() => {
            if (window.gapi && window.gapi.load) {
                clearInterval(poll);
                window.gapi.load('client:picker', () => {
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
                });
            }
        }, 100);
    });
};

/**
 * Initializes the Google Identity Services token client.
 */
export const initTokenClient = (callback: (tokenResponse: any) => void) => {
    window.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_DRIVE_SCOPE,
        callback: callback,
    });
    // Immediately request token after initialization
    window.tokenClient.requestAccessToken({ prompt: '' });
};

/**
 * Shows the Google Picker UI for folder selection.
 */
export const showPicker = (callback: (doc: any) => void) => {
    const accessToken = window.gapi.client.getToken().access_token;
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