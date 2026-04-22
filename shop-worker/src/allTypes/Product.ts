interface Product {
    id?: number;
    name: string;
    desc?: string;
    price: string;
    stock: number;
    imgurl?: string;
    chain_id: string;
    created_at?: string;
}


type ProductList = Product[]

export { Product, ProductList }