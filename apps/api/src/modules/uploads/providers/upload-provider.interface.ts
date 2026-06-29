export interface UploadResult {
  uploadUrl: string;
  fileUrl: string;
}

export interface UploadProvider {
  getPresignedUrl(fileName: string, fileType: string, folder: string): Promise<UploadResult>;
}

export const UPLOAD_PROVIDER = 'UPLOAD_PROVIDER';
