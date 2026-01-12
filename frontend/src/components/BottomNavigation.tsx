import {
  Home,
  ShoppingCart,
  Settings,
  Heart,
} from "lucide-react";

interface BottomNavigationProps {
  currentPage: "home" | "cart" | "likes" | "settings";
  onNavigate: (
    page: "home" | "cart" | "likes" | "settings",
  ) => void;
  cartItemsCount?: number;
  likesCount?: number;
}

export default function BottomNavigation({
  currentPage,
  onNavigate,
  cartItemsCount = 0,
  likesCount = 0,
}: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[rgba(0,0,0,0.35)] z-10 backdrop-blur-md">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Home Button */}
        <button
          onClick={() => onNavigate("home")}
          className={`flex-1 flex flex-col items-center justify-center py-3 transition-all duration-300 ${
            currentPage === "home"
              ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              : "text-white hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]"
          }`}
        >
          <Home
            className={`w-6 h-6 mb-1 ${currentPage === "home" ? "stroke-2" : ""}`}
          />
          <span className="text-xs font-medium">Главная</span>
        </button>

        {/* Cart Button */}
        <button
          onClick={() => onNavigate("cart")}
          className={`flex-1 flex flex-col items-center justify-center py-3 transition-all duration-300 relative ${
            currentPage === "cart"
              ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              : "text-white hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]"
          }`}
        >
          <div className="relative bg-[rgba(0,0,0,0)]">
            <ShoppingCart
              className={`w-6 h-6 mb-1 ${currentPage === "cart" ? "stroke-2" : ""}`}
            />
            {cartItemsCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartItemsCount}
              </div>
            )}
          </div>
          <span className="text-xs font-medium">Корзина</span>
        </button>

        {/* Likes Button */}
        <button
          onClick={() => onNavigate("likes")}
          className={`flex-1 flex flex-col items-center justify-center py-3 transition-all duration-300 relative ${
            currentPage === "likes"
              ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              : "text-white hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]"
          }`}
        >
          <div className="relative">
            <Heart
              className={`w-6 h-6 mb-1 ${currentPage === "likes" ? "fill-current stroke-2" : ""}`}
            />
            {likesCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {likesCount}
              </div>
            )}
          </div>
          <span className="text-xs font-medium">Избранное</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => onNavigate("settings")}
          className={`flex-1 flex flex-col items-center justify-center py-3 transition-all duration-300 ${
            currentPage === "settings"
              ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              : "text-white hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]"
          }`}
        >
          <Settings
            className={`w-6 h-6 mb-1 ${currentPage === "settings" ? "stroke-2" : ""}`}
          />
          <span className="text-xs font-medium">Настройки</span>
        </button>
      </div>
    </div>
  );
}