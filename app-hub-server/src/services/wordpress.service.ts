import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const uri = 'https://redatudo.online/wp-json/wp/v2/media';

async function saveImagesToWordPress(imageList: string[], authorId: any, token: string): Promise<string[]> {
    try {
        const savedImageUrls: string[] = [];
        for (const base64Image of imageList) {
            const buffer = Buffer.from(base64Image, 'base64');
            const newDate = new Date();
            const filename = `img-${authorId}-${newDate.getTime()}.jpg`;
            fs.writeFileSync(filename, buffer);
            const savedImageUrl = await uploadImageToWordPress(filename, authorId, token);
            savedImageUrls.push(savedImageUrl);
            // Excluir o arquivo temporário após o upload
            fs.unlinkSync(filename);
        }
        return savedImageUrls;
    } catch (error) {
        throw new Error(error.message);
    }
}

async function uploadImageToWordPress(filename: string, authorId: number, token: string): Promise<string> {
    try {
        const fileBuffer = fs.readFileSync(filename);
        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: filename,
            contentType: 'image/png', // Altere o tipo de arquivo conforme necessário
        });
        formData.append('status', 'private');
        formData.append('author', String(authorId));
        const response = await axios.post(uri, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`, // Token de autenticação da API
            },
        });
        return response.data.source_url;
    } catch (error) {
        throw new Error(error.message);
    }
}

async function uploadAudioToWordPress(speaker_wav: Express.Multer.File, authorId: number, token: string): Promise<string> {
    try {
        const formData = new FormData();
        formData.append('file', speaker_wav.buffer, {
            filename: speaker_wav.filename,
            contentType: 'audio/wav', // Altere o tipo de arquivo conforme necessário
        });
        formData.append('status', 'private');
        formData.append('author', String(authorId));
        const response = await axios.post(uri, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`, // Token de autenticação da API
            },
        });
        return response.data.source_url;
    } catch (error) {
        throw new Error(error.message);
    }
}

//return public url media
async function uploadMedia(mediaFile, authorId, token): Promise<string> {
    const formData = new FormData();
    const newDate = new Date();
    const originalname = mediaFile.originalname;
    const extension = path.extname(originalname).slice(1);
    const filename = `media-${authorId}-${newDate.getTime()}.${extension}`;
    formData.append('file', mediaFile.buffer, {
        filename: filename,
        contentType: mediaFile.mimetype, // Altere o tipo de arquivo conforme necessário
    });
    formData.append('status', 'private');
    formData.append('author', String(authorId));
    const response = await axios.post(uri, formData, {
        headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${token}`, // Token de autenticação da API
        },
    });
    return response.data.source_url;
}

async function getMe(token:string):Promise<any>{
    const url = 'https://redatudo.online/wp-json/api/v1/me'
    const result = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Origin': 'https://chat.redatudo.online',
            'Referer': 'https://chat.redatudo.online/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
        }
    })
    const { email, id, role, subscription, user_display_name, user_registered } = result.data
    return { email, id, role, subscription, user_display_name, user_registered }
}

async function getUserSubscription(token: string): Promise<any> {
    const url = 'https://redatudo.online/wp-json/api/v1/subscription'
    const result = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Origin': 'https://chat.redatudo.online',
            'Referer': 'https://chat.redatudo.online/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
        }
    })
    return result.data
}

async function addCreditsFromPurchase(token: string, productId: string, quantity: number): Promise<any> {
    const url = 'https://redatudo.online/wp-json/api/v1/add_credits'
    const result = await axios.post(url, { productId, quantity }, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Origin': 'https://chat.redatudo.online',
            'Referer': 'https://chat.redatudo.online/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
        }
    })
    return result.data
}

async function getUserByEmail(token:string, email:string):Promise<any>{
    const url = 'https://redatudo.online/wp-json/api/v1/user_by_email'
    const response = await axios.post(url, { email }, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Origin': 'https://chat.redatudo.online',
            'Referer': 'https://chat.redatudo.online/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
        }
    })
    const { id } = response.data
    return { email, id }
}

async function getProductVariations(productId: string): Promise<any[]> {
    const url = `https://redatudo.online/wp-json/wc/v3/products/${productId}/variations`;
    const consumerKey = process.env.WC_CONSUMER_KEY || process.env.SMTP_CONSUMER_KEY; // Use WC_CONSUMER_KEY if available
    const consumerSecret = process.env.WC_CONSUMER_SECRET || process.env.WOOCOMMERCE_SECRET; // Use WC_CONSUMER_SECRET if available
    const auth = {
        username: consumerKey,
        password: consumerSecret
    };
    const response = await axios.get(url, { auth });
    return response.data;
}

export { saveImagesToWordPress, uploadImageToWordPress, getUserByEmail,
    uploadAudioToWordPress, uploadMedia, getMe, getUserSubscription, addCreditsFromPurchase, getProductVariations }
