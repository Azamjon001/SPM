import { Lock } from 'lucide-react';

interface PrivateCompanyButtonProps {
  onClick: () => void;
}

export default function PrivateCompanyButton({ onClick }: PrivateCompanyButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:from-purple-600 hover:to-purple-700 transition-all hover:scale-110 z-40 flex items-center gap-2 group"
      title="Доступ к приватной компании"
    >
      <Lock className="w-6 h-6" />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium">
        Приватная компания
      </span>
    </button>
  );
}
