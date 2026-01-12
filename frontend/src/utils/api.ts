/**
 * ============================================
 * AZATON API CLIENT
 * Go Backend bilan ishlash uchun to'liq API
 * ============================================
 * 
 * Bu fayl Supabase o'rniga Go Backend ishlatadi
 * API_BASE: http://localhost:8081/api (Docker)
 * ============================================
 */


// API Base URL - Docker yoki local
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

console.log('🌐 [API] Base URL:', API_BASE);

// ============================================
// HELPER FUNCTIONS
// ============================================

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
                try {
                    const errorData = JSON.parse(body);
                    errorMessage = errorData.error || errorData.message || response.statusText;
                } catch {
                    errorMessage = body || response.statusText;
                }
            } catch {
                errorMessage = response.statusText;
            }

            if (!(endpoint.includes('/companies') && response.status === 404)) {
                console.error(`❌ [API] Failed ${endpoint}:`, errorMessage);
            }

            throw new Error(errorMessage);
        }

        console.log(`✅ [API] Success: ${endpoint}`);
        return response.json();
    } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            console.error(`❌ [API] Network error for ${endpoint}`);
            throw new Error('NETWORK_ERROR: Не удалось подключиться к серверу. Проверьте подключение.');
        }
        throw error;
    }
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkServerHealth(): Promise<boolean> {
    try {
        console.log('🏥 [Health Check] Testing server connection...');
        const response = await fetch(`${API_BASE.replace('/api', '')}/health`);
        if (response.ok) {
            console.log('✅ [Health Check] Server is healthy');
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ [Health Check] Server is DOWN!', error);
        return false;
    }
}

// ============================================
// MAIN COMPANY CONSTANT
// ============================================

export const MAIN_COMPANY = {
    id: 1,
    name: 'Главная Компания',
    phone: '909383572',
    password: '24067',
    access_key: '123456789012345678901234567890'
};

// ============================================
// COMPANIES API
// ============================================

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

export async function addCompany(company: {
    name: string;
    phone: string;
    password: string;
    access_key: string;
    is_private?: boolean;
    company_id?: string;
    first_name?: string;
    last_name?: string;
}) {
    const data = await apiCall<{ success: boolean; company: any }>('/companies', {
        method: 'POST',
        body: JSON.stringify(company),
    });
    return data.company;
}

export async function loginCompany(phone: string, password: string) {
    console.log('🔐 [API] Login company request');
    const data = await apiCall<{ success: boolean; token?: string; company: any }>('/companies/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
    });

    if (data.token) {
        localStorage.setItem('auth_token', data.token);
    }

    if (!data.success) {
        throw new Error('Login failed');
    }

    return data.company;
}

export async function verifyCompanyAccess(companyId: number, accessKey: string) {
    console.log('🔑 [API] Verify access request for company:', companyId);
    const data = await apiCall<{ success: boolean; company: any }>('/companies/verify-access', {
        method: 'POST',
        body: JSON.stringify({ company_id: companyId, access_key: accessKey }),
    });

    if (!data.success) {
        throw new Error('Access verification failed');
    }

    return data.company;
}

export async function updateCompany(id: number, updates: any) {
    await apiCall(`/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

export async function toggleCompanyPrivacy(companyId: number, isPrivate: boolean, privateId?: string) {
    const data = await apiCall<{ is_private: boolean; company: any }>(`/companies/${companyId}/toggle-privacy`, {
        method: 'PATCH',
        body: JSON.stringify({ is_private: isPrivate, company_id: privateId }),
    });
    return data.company;
}

export async function deleteCompany(id: string | number) {
    await apiCall(`/companies/${id}`, { method: 'DELETE' });
}

export async function getMainCompany() {
    try {
        const data = await apiCall<{ company: any }>(`/companies/${MAIN_COMPANY.id}`);
        return data.company;
    } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
            const allData = await apiCall<{ companies: any[] }>('/companies');
            const companies = allData.companies || [];

            const company = companies.find((c: any) =>
                c.phone === MAIN_COMPANY.phone.replace(/\s/g, '')
            );

            if (company) {
                (MAIN_COMPANY as any).id = company.id;
                return company;
            }

            if (companies.length > 0) {
                (MAIN_COMPANY as any).id = companies[0].id;
                return companies[0];
            }

            // Create new company
            return await addCompany({
                name: MAIN_COMPANY.name,
                phone: MAIN_COMPANY.phone,
                password: MAIN_COMPANY.password,
                access_key: MAIN_COMPANY.access_key
            });
        }
        throw error;
    }
}

export async function updateMainCompany(updates: { name?: string; phone?: string; password?: string; access_key?: string }) {
    const currentCompany = await getMainCompany();
    await apiCall(`/companies/${currentCompany.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
    return currentCompany;
}

export async function getCompanyProfile(companyId: number) {
    const data = await apiCall<{ profile: any }>(`/companies/${companyId}/profile`);
    return data.profile || data;
}

export async function rateCompany(companyId: number, customerId: string, rating: number) {
    return await apiCall(`/companies/${companyId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ customer_id: customerId, rating }),
    });
}

export async function getCompanyRevenue(companyId: number) {
    try {
        const data = await apiCall<{ stats: any }>(`/companies/${companyId}/financial-stats`);
        return {
            totalRevenue: data.stats?.totalRevenue || 0,
            companyEarnings: data.stats?.totalMarkupProfit || 0,
            sellersRevenue: 0
        };
    } catch (error) {
        console.error('❌ [API] Error getting company revenue:', error);
        return { totalRevenue: 0, companyEarnings: 0, sellersRevenue: 0 };
    }
}

export async function getFinancialStats(companyId: number) {
    try {
        const data = await apiCall<{ stats: any }>(`/companies/${companyId}/financial-stats`);
        return {
            totalMarkupProfit: data.stats?.totalMarkupProfit || 0,
            totalRevenue: data.stats?.totalRevenue || 0,
            salesCount: data.stats?.salesCount || 0,
            orders: data.stats?.orders || []
        };
    } catch (error) {
        console.error('❌ [API] Error getting financial stats:', error);
        return { totalMarkupProfit: 0, totalRevenue: 0, salesCount: 0, orders: [] };
    }
}

// ============================================
// PRODUCTS API
// ============================================

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
    if (!product.company_id || isNaN(product.company_id)) {
        throw new Error('Invalid company_id: ' + product.company_id);
    }

    // Clean numeric fields
    const cleanedProduct = { ...product };
    const numericFields = ['quantity', 'price', 'markup_percent'];
    numericFields.forEach(field => {
        const value = cleanedProduct[field as keyof typeof cleanedProduct];
        if (value === '' || value === null || value === undefined) {
            cleanedProduct[field as keyof typeof cleanedProduct] = field === 'markup_percent' ? 0 : (null as any);
        }
    });

    const data = await apiCall<{ product: any }>('/products/add', {
        method: 'POST',
        body: JSON.stringify(cleanedProduct),
    });
    return data;
}

export async function updateProduct(id: number, updates: any) {
    const cleanedUpdates = { ...updates };
    delete cleanedUpdates.company_id; // Never change company_id

    const numericFields = ['price', 'markup_percent', 'markup_amount', 'selling_price', 'quantity', 'barcode', 'barid'];
    numericFields.forEach(field => {
        if (cleanedUpdates[field] === '' || cleanedUpdates[field] === null || cleanedUpdates[field] === undefined) {
            cleanedUpdates[field] = null;
        } else if (typeof cleanedUpdates[field] === 'string') {
            const parsed = parseFloat(cleanedUpdates[field]);
            cleanedUpdates[field] = isNaN(parsed) ? null : parsed;
        }
    });

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
    const cleanedProducts = products.map(product => {
        const cleaned = { ...product };
        const numericFields = ['quantity', 'price', 'markup_percent'];
        numericFields.forEach(field => {
            if (cleaned[field] === '' || cleaned[field] === null || cleaned[field] === undefined) {
                cleaned[field] = field === 'markup_percent' ? 0 : 0;
            } else if (typeof cleaned[field] === 'string') {
                const parsed = parseFloat(cleaned[field]);
                cleaned[field] = isNaN(parsed) ? 0 : parsed;
            }
        });
        return cleaned;
    });

    await apiCall('/products/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ company_id: companyId, products: cleanedProducts }),
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
    console.log(`🚀 [API] Bulk toggle ${productIds.length} products to ${setAvailable}`);
    const data = await apiCall('/products/bulk-toggle-availability', {
        method: 'POST',
        body: JSON.stringify({ product_ids: productIds, set_available: setAvailable }),
    });
    return data;
}

export async function bulkUpdateBarcodes(updates: Array<{ id: number; barcode: string }>) {
    console.log(`📊 [API] Bulk update ${updates.length} barcodes`);
    const data = await apiCall('/products/bulk-update-barcodes', {
        method: 'POST',
        body: JSON.stringify({ updates }),
    });
    return data;
}

export async function uploadProductImage(productId: number, imageFile: File) {
    console.log('📸 [API] Uploading image for product:', productId);

    const formData = new FormData();
    formData.append('image', imageFile);

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/products/${productId}/upload-image`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Image upload error: ${error}`);
    }

    return response.json();
}

export async function getProductImages(productId: number) {
    const data = await apiCall<{ images: any[] }>(`/products/${productId}/images`);
    return data.images || [];
}

export async function deleteProductImage(productId: number, imageIndex: number) {
    await apiCall(`/products/${productId}/images/${imageIndex}`, { method: 'DELETE' });
}

// ============================================
// USERS API
// ============================================

export async function getUsers() {
    const data = await apiCall<{ users: any[] }>('/users');
    return data.users || [];
}

export async function addUser(user: { first_name: string; last_name: string; phone_number: string; company_id?: string | null }) {
    const data = await apiCall<{ user: any }>('/users', {
        method: 'POST',
        body: JSON.stringify(user),
    });
    return data;
}

export async function getUserByPhone(phone: string) {
    const data = await apiCall<{ user: any }>(`/users/${phone}`);
    return data.user || null;
}

export async function deleteAllUsers() {
    await apiCall('/users', { method: 'DELETE' });
}

// ============================================
// CUSTOMER ORDERS API
// ============================================

export async function getCustomerOrders(companyId: number) {
    try {
        console.log(`📦 [API] Loading customer orders for company ${companyId}...`);
        const data = await apiCall<{ success: boolean; orders: any[]; auto_cancelled?: number }>(
            `/customer-orders?company_id=${companyId}`
        );

        if (data.auto_cancelled && data.auto_cancelled > 0) {
            console.log(`ℹ️ [API] ${data.auto_cancelled} orders were auto-cancelled`);
        }

        console.log(`✅ [API] Customer orders loaded: ${data.orders?.length || 0} records`);
        return data.orders || [];
    } catch (error) {
        console.error('❌ [API] Error getting customer orders:', error);
        return [];
    }
}

export async function addCustomerOrder(order: {
    user_id?: number;
    user_name?: string;
    user_phone?: string;
    items: any[];
    total_amount: number;
}) {
    try {
        console.log('📝 [API] Creating customer order...');
        const data = await apiCall<{
            success: boolean;
            order_id: number;
            order_code: string;
            unavailableItems?: any[];
            error?: string;
        }>('/customer-orders', {
            method: 'POST',
            body: JSON.stringify(order)
        });

        if (!data.success) {
            if (data.unavailableItems) {
                throw new Error(`Некоторые товары недоступны:\n${data.unavailableItems.map((item: any) => `• ${item.name}: ${item.reason || 'Недоступен'}`).join('\n')}`);
            }
            throw new Error(data.error || 'Ошибка создания заказа');
        }

        console.log('✅ [API] Order created:', data.order_code);
        return { order_id: data.order_id, order_code: data.order_code };
    } catch (error) {
        console.error('❌ [API] Error creating order:', error);
        throw error;
    }
}

export async function confirmOrderPayment(orderId: number) {
    console.log(`💰 [API] Confirming payment for order #${orderId}...`);
    const result = await apiCall<{ success: boolean }>(`/customer-orders/${orderId}/confirm-payment`, {
        method: 'PUT',
    });
    console.log('✅ [API] Order confirmed!');
    return result;
}

export async function cancelOrder(orderId: number) {
    console.log(`🚫 [API] Cancelling order ${orderId}...`);
    const data = await apiCall<{ success: boolean }>(`/customer-orders/${orderId}/cancel`, {
        method: 'PUT',
    });
    console.log(`✅ [API] Order ${orderId} cancelled`);
    return data;
}

export async function searchOrderByCode(orderCode: string) {
    const data = await apiCall<{ order: any }>(`/customer-orders/search/${orderCode}`);
    return data.order;
}

export async function getOrdersByPhone(phoneNumber: string) {
    try {
        console.log('📱 [API] Getting orders by phone:', phoneNumber);
        const data = await apiCall<{ orders: any[] }>(`/customer-orders?user_phone=${phoneNumber}`);
        return data.orders || [];
    } catch (error) {
        console.error('❌ [API] Error getting orders by phone:', error);
        return [];
    }
}

// ============================================
// SALES HISTORY API
// ============================================

export async function getSalesHistory(companyId: number) {
    try {
        const data = await apiCall<{ sales: any[] }>(`/sales-history?company_id=${companyId}`);
        console.log(`📊 [API] Sales history loaded: ${data.sales?.length || 0} records`);
        return data.sales || [];
    } catch (error) {
        console.error('❌ [API] Error getting sales history:', error);
        return [];
    }
}

export async function addSale(sale: { company_id: number; items: any[]; total_amount: number }) {
    const data = await apiCall<{ success: boolean; sale_id: number }>('/sales-history', {
        method: 'POST',
        body: JSON.stringify(sale),
    });
    return data;
}

export async function addCashierSale(sale: {
    company_id: number;
    items: any[];
    total_amount: number;
    markup_profit: number;
}) {
    try {
        console.log('💰 [API] Creating cashier sale...');
        const orderCode = `CASH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const data = await apiCall<{ success: boolean; order_id: number; order_code: string }>('/customer-orders', {
            method: 'POST',
            body: JSON.stringify({
                company_id: sale.company_id,
                user_name: 'Касса',
                user_phone: 'CASH',
                order_code: orderCode,
                items: sale.items,
                total_amount: sale.total_amount,
                markup_profit: sale.markup_profit,
                status: 'completed',
                payment_confirmed: true,
            })
        });

        if (data.order_id) {
            await confirmOrderPayment(data.order_id);
        }

        console.log('✅ [API] Cashier sale saved');
        return { success: true, order: data };
    } catch (error) {
        console.error('❌ [API] Error creating cashier sale:', error);
        throw error;
    }
}

// ============================================
// EXPENSES API
// ============================================

export async function getCompanyExpenses(companyId: number) {
    console.log('💰 [API] Get company expenses:', companyId);
    try {
        const data = await apiCall<{ expenses: any }>(`/expenses?company_id=${companyId}`);

        // Get custom expenses
        const customData = await apiCall<{ expenses: any[] }>(`/expenses/custom?company_id=${companyId}`).catch(() => ({ expenses: [] }));

        const totalCustomExpenses = customData.expenses?.reduce((sum: number, expense: any) => {
            return sum + (parseFloat(expense.amount) || 0);
        }, 0) || 0;

        return {
            expenses: {
                ...data.expenses,
                custom_expenses: totalCustomExpenses,
                all_custom_expenses: customData.expenses || []
            }
        };
    } catch (error) {
        console.error('❌ [API] Error getting expenses:', error);
        return {
            expenses: {
                employee_expenses: 0,
                electricity_expenses: 0,
                purchase_costs: 0,
                custom_expenses: 0,
                all_custom_expenses: []
            }
        };
    }
}

export async function updateCompanyExpenses(
    companyId: number,
    expenses: {
        employee_expenses?: number;
        electricity_expenses?: number;
        purchase_costs?: number;
    }
) {
    console.log('💰 [API] Update company expenses:', { companyId, expenses });
    const data = await apiCall('/expenses', {
        method: 'POST',
        body: JSON.stringify({
            company_id: companyId,
            employee_expenses: expenses.employee_expenses ?? 0,
            electricity_expenses: expenses.electricity_expenses ?? 0,
            purchase_costs: expenses.purchase_costs ?? 0
        }),
    });
    console.log('✅ [API] Expenses saved');
    return data;
}

export async function addCustomExpense(companyId: number, expense: { name: string; amount: number; expense_date: string; description?: string }) {
    return await apiCall('/expenses/custom', {
        method: 'POST',
        body: JSON.stringify({ company_id: companyId, ...expense }),
    });
}

export async function updateCustomExpense(expenseId: number, expense: { name?: string; amount?: number; description?: string }) {
    return await apiCall(`/expenses/custom/${expenseId}`, {
        method: 'PUT',
        body: JSON.stringify(expense),
    });
}

export async function deleteCustomExpense(expenseId: number) {
    return await apiCall(`/expenses/custom/${expenseId}`, { method: 'DELETE' });
}

// ============================================
// USER CART API
// ============================================

export async function getUserCart(phoneNumber: string) {
    console.log('🛒 [API] Get user cart:', phoneNumber);
    try {
        const data = await apiCall<{ cart: any }>(`/user-cart?phone_number=${phoneNumber}`);
        return data.cart || {};
    } catch {
        return {};
    }
}

export async function saveUserCart(phoneNumber: string, cartData: any) {
    console.log('💾 [API] Save user cart:', phoneNumber);
    await apiCall('/user-cart', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phoneNumber, cart_data: cartData }),
    });
}

export async function clearUserCart(phoneNumber: string) {
    await apiCall(`/user-cart/${phoneNumber}`, { method: 'DELETE' });
}

// ============================================
// USER RECEIPTS API
// ============================================

export async function getUserReceipts(phoneNumber: string) {
    console.log('📄 [API] Get user receipts:', phoneNumber);
    try {
        const data = await apiCall<{ receipts: any[] }>(`/user-receipts?phone_number=${phoneNumber}`);
        return data.receipts || [];
    } catch {
        return [];
    }
}

export async function saveUserReceipt(receipt: {
    phone_number: string;
    order_code: string;
    total: number;
    items_count: number;
    items: any[];
}) {
    console.log('💾 [API] Save user receipt:', receipt.order_code);
    await apiCall('/user-receipts', {
        method: 'POST',
        body: JSON.stringify(receipt),
    });
}

export async function deleteUserReceipt(receiptId: number) {
    await apiCall(`/user-receipts/${receiptId}`, { method: 'DELETE' });
}

// ============================================
// USER LIKES API
// ============================================

export async function getUserLikes(phoneNumber: string) {
    console.log('❤️ [API] Get user likes:', phoneNumber);
    try {
        const data = await apiCall<{ liked_product_ids: number[] }>(`/user-likes?phone_number=${phoneNumber}`);
        return data.liked_product_ids || [];
    } catch {
        return [];
    }
}

export async function saveUserLikes(phoneNumber: string, likedProductIds: number[]) {
    console.log('💾 [API] Save user likes:', phoneNumber);
    await apiCall('/user-likes', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phoneNumber, liked_product_ids: likedProductIds }),
    });
}

export async function addProductToLikes(phoneNumber: string, productId: number) {
    await apiCall('/user-likes/add', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phoneNumber, product_id: productId }),
    });
}

export async function removeProductFromLikes(phoneNumber: string, productId: number) {
    await apiCall(`/user-likes/${productId}?phone_number=${phoneNumber}`, { method: 'DELETE' });
}

// ============================================
// ADVERTISEMENTS API
// ============================================

export interface Advertisement {
    id: string;
    company_id: number;
    company_name: string;
    smm_post_id: string;
    image_url: string;
    caption: string;
    link_url?: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    submitted_at: string;
    reviewed_at?: string;
    reviewed_by?: string;
    rejection_reason?: string;
}

export async function createAdvertisement(data: {
    company_id: number;
    company_name: string;
    smm_post_id: string;
    image_url: string;
    caption: string;
    link_url?: string;
}) {
    return await apiCall('/ads', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function getAdvertisements(filters?: {
    status?: 'pending' | 'approved' | 'rejected';
    company_id?: number;
}) {
    let endpoint = '/ads';
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.company_id) params.append('company_id', filters.company_id.toString());

    if (params.toString()) {
        endpoint += `?${params.toString()}`;
    }

    const data = await apiCall<{ advertisements: any[] }>(endpoint);
    return { ads: data.advertisements || [] };
}

export async function getApprovedAdvertisements() {
    const data = await apiCall<{ advertisements: any[] }>('/ads/approved');
    return data.advertisements || [];
}

export async function approveAdvertisement(adId: string) {
    return await apiCall(`/ads/${adId}/approve`, { method: 'PUT' });
}

export async function rejectAdvertisement(adId: string, reason?: string) {
    return await apiCall(`/ads/${adId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
    });
}

export async function deleteAdvertisement(adId: string) {
    console.log('🗑️ [API] Deleting advertisement:', adId);
    return await apiCall(`/ads/${adId}`, { method: 'DELETE' });
}

// ============================================
// CHAT API (for AdminChatPanel and CompanyChatPanel)
// ============================================

export interface ChatMessage {
    id: number;
    sender_type: 'admin' | 'company';
    company_id: number;
    message_type: 'text' | 'voice' | 'image' | 'video' | 'file';
    message_text: string | null;
    media_url: string | null;
    media_filename: string | null;
    voice_duration: number | null;
    video_duration: number | null;
    is_read: boolean;
    created_at: string;
    reply_to?: any;
}

export interface ChatInfo {
    company_id: number;
    company_name: string;
    company_phone: string;
    unread_count_for_admin: number;
    last_message_text: string;
    last_message_at: string;
}

export async function getChats() {
    const data = await apiCall<{ chats: ChatInfo[] }>('/chats');
    return data.chats || [];
}

export async function getChatMessages(companyId: number) {
    const data = await apiCall<{ messages: ChatMessage[] }>(`/chats/${companyId}/messages`);
    return data.messages || [];
}

export async function sendChatMessage(message: {
    company_id: number;
    sender_type: 'admin' | 'company';
    message_type: string;
    message_text?: string;
    media_url?: string;
    media_filename?: string;
    voice_duration?: number;
    video_duration?: number;
    reply_to_id?: number;
}) {
    return await apiCall('/chats/messages', {
        method: 'POST',
        body: JSON.stringify(message),
    });
}

export async function markMessagesAsRead(companyId: number, readerType: 'admin' | 'company') {
    return await apiCall(`/chats/${companyId}/read`, {
        method: 'PUT',
        body: JSON.stringify({ reader_type: readerType }),
    });
}

export async function uploadChatMedia(companyId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', companyId.toString());

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/chats/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
    });

    if (!response.ok) throw new Error('Failed to upload media');
    return response.json();
}
