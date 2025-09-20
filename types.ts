export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'other';

export interface LibraryItem {
  id: string;
  type: MediaType;
  title: string;
  description: string;
  tags: string[];
  url: string;
  content?: string; // For text-based content
  source: 'drive' | 'local';
  webViewLink?: string; // Direct link to open in Google Drive
  iconLink?: string; // A link to the file's icon
}

export interface SearchResult extends LibraryItem {}


// Vendored types for jwt-decode
export interface JwtPayload {
	[key: string]: any;
	iss?: string | undefined;
	sub?: string | undefined;
	aud?: string | string[] | undefined;
	exp?: number | undefined;
	nbf?: number | undefined;
	iat?: number | undefined;
	jti?: string | undefined;
}

export interface JwtHeader {
	[key: string]: any;
	typ?: string | undefined;
	alg?: string | undefined;
	kid?: string | undefined;
}

export interface JwtDecodeOptions {
	header?: boolean | undefined;
}

export declare function jwtDecode<T = JwtPayload>(token: string, options?: JwtDecodeOptions): T;