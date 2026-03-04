export interface EbookMetadata {
    title: string;
    description: string;
    niche: string;
    tone: string;
    language: string;
    keywords: string[];
    audience: string;
}

export interface Chapter {
    title: string;
    sections: Section[];
}

export interface Section {
    title: string;
    content: string;
    keywords?: string[];
    word_count?: number;
}
