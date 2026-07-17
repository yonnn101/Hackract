import api from './axiosConfig';

/**
 * Upload a file to the generic storage upload endpoint.
 * @param {File} file - The file object to upload
 * @param {string} folder - Optional folder name to organize the file in storage
 * @returns {Promise<string>} - Returns the uploaded file's storage URL
 */
export const uploadFile = async (file, folder = 'uploads') => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post(`/uploads?folder=${folder}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data && response.data.url) {
      return response.data.url;
    } else {
      throw new Error('No URL returned from upload endpoint');
    }
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
};
