export interface TenantInfo {
    id: string;
    name: string;
    subdomain: string;
    logoUrl?: string;
    primaryColor?: string;
}

export interface Banner {
    id: string;
    title: string;
    subtitle?: string;
    image_url: string;
    cta_text?: string;
    cta_url?: string;
    priority: number;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    stock: number;
    total_sold?: number;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    image_url?: string;
    description?: string;
    product_count?: number;
}

export interface Promotion {
    id: string;
    title: string;
    description?: string;
    discount_percent?: number;
    banner_url?: string;
    starts_at?: string;
    ends_at?: string;
}

export interface Testimonial {
    id: string;
    customer_name: string;
    rating: number;
    review_text: string;
    product_name?: string;
    created_at: string;
}

export interface HomePageData {
    tenant: TenantInfo;
    sections: {
        hero: Banner[];
        bestSellers: Product[];
        categories: Category[];
        promotions: Promotion[];
        testimonials: Testimonial[];
    };
    metadata: {
        lastUpdated: string;
        cacheTTL: number;
    };
}
