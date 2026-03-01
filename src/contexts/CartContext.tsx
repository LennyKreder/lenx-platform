'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  CartItem,
  loadCartFromStorage,
  saveCartToStorage,
  clearCartStorage,
  calculateCartTotal,
  calculateCartItemCount,
} from '@/lib/cart';

export interface AppliedDiscountCode {
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  valueInCents: number | null;
  valuePercent: number | null;
  discountAmount: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: number, bundleId?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  totalInCents: number;
  itemCount: number;
  isLoading: boolean;
  appliedDiscount: AppliedDiscountCode | null;
  setAppliedDiscount: (discount: AppliedDiscountCode | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscountCode | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const storedItems = loadCartFromStorage();
    setItems(storedItems);
    setIsLoading(false);
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (!isLoading) {
      saveCartToStorage(items);
    }
  }, [items, isLoading]);

  const addItem = useCallback((newItem: Omit<CartItem, 'quantity'>) => {
    setItems((currentItems) => {
      const existingIndex = currentItems.findIndex(
        (item) => item.productId === newItem.productId && item.bundleId === newItem.bundleId
      );

      if (existingIndex >= 0) {
        // Item exists, increment quantity
        const updated = [...currentItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }

      // New item, add with quantity 1
      return [...currentItems, { ...newItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: number, bundleId?: number) => {
    setItems((currentItems) =>
      currentItems.filter((item) => {
        if (bundleId) {
          return item.bundleId !== bundleId;
        }
        return item.productId !== productId || item.bundleId !== undefined;
      })
    );
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedDiscount(null);
    clearCartStorage();
  }, []);

  const totalInCents = calculateCartTotal(items);
  const itemCount = calculateCartItemCount(items);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isOpen,
        setIsOpen,
        totalInCents,
        itemCount,
        isLoading,
        appliedDiscount,
        setAppliedDiscount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
