const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require('uuid'); // For unique filenames

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
    throw new Error("Azure Storage Connection String not found in environment variables.");
}
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "courses"; // Default container

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Ensure container exists
containerClient.createIfNotExists()
    .then(() => console.log(`Azure Blob container "${containerName}" ensured.`))
    .catch(error => console.error(`Error ensuring container "${containerName}":`, error));

const uploadStreamToBlob = async (buffer, originalname, mimetype) => {
    const blobName = `${uuidv4()}-${originalname}`; // Create a unique blob name
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
        console.log(`Uploading ${blobName} to Azure Blob Storage...`);
        await blockBlobClient.uploadData(buffer, {
             blobHTTPHeaders: { blobContentType: mimetype }
        });
        console.log(`Upload successful: ${blockBlobClient.url}`);
        return blockBlobClient.url; // Return the public URL
    } catch (error) {
        console.error("Error uploading to Azure Blob Storage:", error);
        throw error; // Re-throw the error to be caught by the controller
    }
};


 const getBlobSasUrl = async (blobName, permissions = 'r', expiryMinutes = 60) => {
    const { generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require("@azure/storage-blob");

    // Extract account name and key from connection string (simplistic approach)
    // A more robust method would parse the connection string properly
    const parts = connectionString.split(';');
    const accountName = parts.find(p => p.startsWith('AccountName=')).split('=')[1];
    const accountKey = parts.find(p => p.startsWith('AccountKey=')).split('=')[1]; // WARNING: Exposes key if logged!

    if (!accountName || !accountKey) {
         throw new Error("Could not parse AccountName or AccountKey from connection string.");
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + expiryMinutes);

    const sasOptions = {
        containerName: containerName,
        blobName: blobName,
        startsOn: new Date(),
        expiresOn: expiryTime,
        permissions: BlobSASPermissions.parse(permissions), // 'r' for read
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    const blobClient = containerClient.getBlobClient(blobName);

    return `${blobClient.url}?${sasToken}`;
};


module.exports = { uploadStreamToBlob, getBlobSasUrl, containerClient }; // Export containerClient if needed elsewhere