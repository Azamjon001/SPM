/**
 * API Client for Azaton Go Backend
 * Replaces Supabase API calls with direct Go backend calls
 */

// Base URL for the Go backend API
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Helper function for API calls
async function apiCall<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
        const url = `${API_BASE}${endpoint}`;
        console.log(`🌐 [API] Calling: ${url}`);

        const token = localStorage.getItem('auth_token');

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers,
            },
        });

        if (!response.ok) {
            let errorMessage = response.statusText;
            try {
                const body = await response.text();
                const errorData = JSON.parse(body);
                errorMessage = errorData.error || errorData.message || response.statusText;
            } catch {
                // Use status text
            }

            console.error(`❌ [API] Failed ${endpoint}:`, errorMessage);
            throw new Error(errorMessage);
        }

        console.log(`✅ [API] Success: ${endpoint}`);
        return response.json();
    } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            console.error(`❌ [API] Network error for ${endpoint}`);
            throw new Error('NETWORK_ERROR: Не удалось подключиться к серверу.');
        }
        throw error;
    }
}

// Health Check
export async function checkServerHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE.replace('/api', '')}/health`);
        return response.ok;
    } catch {
        return false;
    }
}

// ========== Companies API ==========

export async function getCompanies() {
    const data = await apiCall<{ companies: any[] }>('/companies');
    return data.companies || [];
}

export async function getCompany(id: number) {
    const data = await apiCall<{ company: any }>(`/companies/${id}`);
    return data.company;
}

export async function getCompanyByCompanyId(companyId: string) {
    const data = await apiCall<{ company: any }>(`/companies/by-company-id/${companyId}`);
    return data.company;
}

export async function createCompany(company: {
    company_id: string;
    company_name: string;
    owner_phone: string;
    password: string;
    access_key: string;
}) {
    const data = await apiCall<{ company: any }>('/companies', {
        method: 'POST',
        body: JSON.stringify(company),
    });
    return data.company;
}

export async function loginCompany(companyId: string, password: string) {
    const data = await apiCall<{ success: boolean; token: string; company: any }>('/companies/login', {
        method: 'POST',
        body: JSON.stringify({ company_id: companyId, password }),
    });

    if (data.token) {
        localStorage.setItem('auth_token', data.token);
    }

    return data;
}

export async function verifyCompanyAccess(companyId: string, accessKey: string) {
    const data = await apiCall<{ success: boolean; company: any }>('/companies/verify-access', {
        method: 'POST',
        body: JSON.stringify({ company_id: companyId, access_key: accessKey }),
    });
    return data;
}

export async function updateCompany(id: number, updates: any) {
    await apiCall(`/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

export async function toggleCompanyPrivacy(id: number) {
    const data = await apiCall<{ is_private: boolean }>(`/companies/${id}/toggle-privacy`, {
        method: 'PATCH',
    });
    return data;
}

export async function deleteCompany(id: number) {
    await apiCall(`/companies/${id}`, { method: 'DELETE' });
}

export async function getCompanyProfile(id: number) {
    const data = await apiCall<{ profile: any }>(`/companies/${id}/profile`);
    return data.profile;
}

export async function rateCompany(id: number, phoneNumber: string, rating: number, review?: string) {
    const data = await apiCall<{ success: boolean }>(`/companies/${id}/rate`, {
        method: 'POST',
        body: JSON.stringify({ phone_number: phoneNumber, rating, review }),
    });
    return data;
}

export async function getFinancialStats(id: number) {
    const data = await apiCall<{ stats: any }>(`/companies/${id}/financial-stats`);
    return data.stats;
}

// ========== Products API ==========

export async function getProducts(companyId?: number) {
    const endpoint = companyId ? `/products?company_id=${companyId}` : '/products';
    const data = await apiCall<{ products: any[] }>(endpoint);
    return data.products || [];
}

export async function getProductsPaginated(params: {
    companyId?: number;
    limit?: number;
    offset?: number;
    search?: string;
    availableOnly?: boolean;
}) {
    const { companyId, limit = 50, offset = 0, search = '', availableOnly = false } = params;

    const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        available_only: availableOnly.toString(),
    });

    if (companyId) queryParams.append('company_id', companyId.toString());
    if (search) queryParams.append('search', search);

    const data = await apiCall<{ products: any[]; total: number; hasMore: boolean }>(
        `/products/paginated?${queryParams.toString()}`
    );

    return {
        products: data.products || [],
        total: data.total || 0,
        hasMore: data.hasMore || false
    };
}

export async function addProduct(product: {
    company_id: number;
    name: string;
    quantity: number;
    price: number;
    markup_percent?: number;
    has_color_options?: boolean;
    category?: string;
    barcode?: string;
}) {
    const data = await apiCall<{ product: any }>('/products/add', {
        method: 'POST',
        body: JSON.stringify(product),
    });
    return data;
}

export async function updateProduct(id: number, updates: any) {
    // Remove company_id from updates - should not be changed
    const cleanedUpdates = { ...updates };
    delete cleanedUpdates.company_id;

    await apiCall(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(cleanedUpdates),
    });
}

export async function deleteProduct(id: number) {
    await apiCall(`/products/${id}`, { method: 'DELETE' });
}

export async function deleteAllProducts() {
    await apiCall('/products', { method: 'DELETE' });
}

export async function bulkImportProducts(companyId: number, products: any[]) {
    await apiCall('/products/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ company_id: companyId, products }),
    });
}

export async function toggleProductCustomerAvailability(id: number) {
    const data = await apiCall<{ available_for_customers: boolean }>(
        `/products/${id}/toggle-customer-availability`,
        { method: 'PUT' }
    );
    return data;
}

export async function bulkToggleCustomerAvailability(productIds: number[], setAvailable: boolean) {
    const data = await apiCall('/products/bulk-toggle-availability', {
        method: 'POST',
        body: JSON.stringify({ product_ids: productIds, set_available: setAvailable }),
    });
    return data;
}

export async function bulkUpdateBarcodes(updates: Array<{ id: number; barcode: string }>) {
    const data = await apiCall('/products/bulk-update-barcodes', {
        method: 'POST',
        body: JSON.stringify({ updates }),
    });
    return data;
}

export async function uploadProductImage(productId: number, file: File) {
    const formData = new FormData();
    formData.append('image', file);

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/products/${productId}/upload-image`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
    });

    if (!response.ok) throw new Error('Failed to upload image');
    return response.json();
}

export async function getProductImages(productId: number) {
    const data = await apiCall<{ images: string[] }>(`/products/${productId}/images`);
    return data.images || [];
}

export async function deleteProductImage(productId: number, index: number) {
    await apiCall(`/products/${productId}/images/${index}`, { method: 'DELETE' });
}

// ========== Users API ==========

export async function getUsers() {
    const data = await apiCall<{ users: any[] }>('/users');
    return data.users || [];
}

export async function addUser(user: {
    first_name: string;
    last_name: string;
    phone_number: string;
    company_id?: number;
}) {
    const data = await apiCall<{ user: any }>('/users', {
        method: 'POST',
        body: JSON.stringify(user),
    });
    return data;
}

export async function getUserByPhone(phone: string) {
    const data = await apiCall<{ user: any }>(`/users/${phone}`);
    return data.user;
}

export async function deleteAllUsers() {
    await apiCall('/users', { method: 'DELETE' });
}

// ========== Customer Orders API ==========

export async function getCustomerOrders(companyId: number) {
    const data = await apiCall<{ success: boolean; orders: any[] }>(
        `/customer-orders?company_id=${companyId}`
    );
    return data.orders || [];
}

export async function createCustomerOrder(order: {
    user_id?: number;
    user_name: string;
    user_phone: string;
    items: any[];
    total_amount: number;
}) {
    const data = await apiCall<{ success: boolean; order_id: number; order_code: string }>(
        '/customer-orders',
        {
            method: 'POST',
            body: JSON.stringify(order),
        }
    );
    return data;
}

export async function confirmOrderPayment(orderId: number) {
    const data = await apiCall<{ success: boolean }>(
        `/customer-orders/${orderId}/confirm-payment`,
        { method: 'PUT' }
    );
    return data;
}

export async function cancelOrder(orderId: number) {
    const data = await apiCall<{ success: boolean }>(
        `/customer-orders/${orderId}/cancel`,
        { method: 'PUT' }
    );
    return data;
}

export async function searchOrderByCode(code: string) {
    const data = await apiCall<{ order: any }>(`/customer-orders/search/${code}`);
    return data.order;
}

// ========== Sales History API ==========

export async function getSalesHistory(companyId: number) {
    const data = await apiCall<{ sales: any[] }>(`/sales-history?company_id=${companyId}`);
    return data.sales || [];
}

export async function addSale(sale: {
    company_id: number;
    items: any[];
    total_amount: number;
}) {
    const data = await apiCall<{ success: boolean; sale_id: number }>('/sales-history', {
        method: 'POST',
        body: JSON.stringify(sale),
    });
    return data;
}

// Cashier sale - creates a completed order
export async function addCashierSale(sale: {
    company_id: number;
    items: any[];
    total_amount: number;
    markup_profit: number;
}) {
    // Create as a completed cash order
    const data = await apiCall<{ success: boolean; order_id: number; order_code: string }>(
        '/customer-orders',
        {
            method: 'POST',
            body: JSON.stringify({
                user_name: 'Касса',
                user_phone: 'CASH',
                items: sale.items.map(item => ({ ...item, company_id: sale.company_id })),
                total_amount: sale.total_amount,
            }),
        }
    );

    // Immediately confirm payment
    if (data.order_id) {
        await confirmOrderPayment(data.order_id);
    }

    return data;
}

// ========== Expenses API ==========

export async function getExpenses(companyId: number) {
    const data = await apiCall<{ expenses: any }>(`/expenses/${companyId}`);
    return data.expenses;
}

export async function updateExpenses(companyId: number, expenses: {
    monthly_rent?: number;
    utility_costs?: number;
    worker_salaries?: number;
    other_expenses?: number;
}) {
    const data = await apiCall<{ success: boolean }>(`/expenses/${companyId}`, {
        method: 'POST',
        body: JSON.stringify({ company_id: companyId, ...expenses }),
    });
    return data;
}

// ========== User Cart API ==========

export async function getUserCart(phoneNumber: string) {
    const data = await apiCall<{ cart: any[] }>(`/user-cart/${phoneNumber}`);
    return data.cart || [];
}

export async function saveUserCart(phoneNumber: string, cartItems: any[]) {
    const data = await apiCall<{ success: boolean }>('/user-cart', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phoneNumber, cart_items: cartItems }),
    });
    return data;
}

// ========== User Receipts API ==========

export async function getUserReceipts(phoneNumber: string) {
    const data = await apiCall<{ receipts: any[] }>(`/user-receipts/${phoneNumber}`);
    return data.receipts || [];
}

export async function saveUserReceipt(receipt: {
    phone_number: string;
    company_id?: number;
    company_name?: string;
    items: any[];
    total_amount: number;
}) {
    const data = await apiCall<{ success: boolean; receipt_id: number }>('/user-receipts', {
        method: 'POST',
        body: JSON.stringify(receipt),
    });
    return data;
}

// ========== User Likes API ==========

export async function getUserLikes(phoneNumber: string) {
    const data = await apiCall<{ likes: any[] }>(`/user-likes/${phoneNumber}`);
    return data.likes || [];
}

export async function saveUserLikes(phoneNumber: string, likedProducts: any[]) {
    const data = await apiCall<{ success: boolean }>('/user-likes', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phoneNumber, liked_products: likedProducts }),
    });
    return data;
}

// ========== Advertisements API ==========

export async function getAdvertisements(status?: string) {
    const endpoint = status ? `/ads?status=${status}` : '/ads';
    const data = await apiCall<{ advertisements: any[] }>(endpoint);
    return data.advertisements || [];
}

export async function getApprovedAdvertisements() {
    return getAdvertisements('approved');
}

export async function createAdvertisement(ad: {
    company_id?: number;
    company_name: string;
    title: string;
    description?: string;
    image_url?: string;
    link_url?: string;
    start_date?: string;
    end_date?: string;
}) {
    const data = await apiCall<{ success: boolean; id: number }>('/ads', {
        method: 'POST',
        body: JSON.stringify(ad),
    });
    return data;
}

export async function approveAdvertisement(id: number) {
    const data = await apiCall<{ success: boolean }>(`/ads/${id}/approve`, {
        method: 'PUT',
    });
    return data;
}

export async function rejectAdvertisement(id: number) {
    const data = await apiCall<{ success: boolean }>(`/ads/${id}/reject`, {
        method: 'PUT',
    });
    return data;
}

export async function deleteAdvertisement(id: number) {
    await apiCall(`/ads/${id}`, { method: 'DELETE' });
}

// ========== Utility Functions ==========

// Get current Uzbekistan time as ISO string
export function getUzbekistanISOString(): string {
    const now = new Date();
    // Uzbekistan is UTC+5
    const uzbekOffset = 5 * 60 * 60 * 1000;
    const uzbekTime = new Date(now.getTime() + uzbekOffset);
    return uzbekTime.toISOString();
}

// Main company constant (for demo/development)
export const MAIN_COMPANY = {
    id: 1,
    name: 'Главная Компания',
    phone: '909383572',
    password: '24067',
    access_key: '123456789012345678901234567890'
};
