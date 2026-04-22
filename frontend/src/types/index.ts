export type Product = {
    id: number;
    name: string;
    desc?: string;
    price: string;
    stock: number;
    img_url?: string;
    chain_id: string;
    created_at?: string;
};



export type ApiResponse<T = unknown> = {
    code: number;
    message: string;
    data?: T;
};