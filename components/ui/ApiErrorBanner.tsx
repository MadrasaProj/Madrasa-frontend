import { WifiOff, AlertCircle, RefreshCw, Clock } from "lucide-react";
import { NETWORK_ERROR, TIMEOUT_ERROR } from "@/lib/fetch";

interface Props {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ApiErrorBanner({ message, onRetry, className }: Props) {
  const isNetwork = message === NETWORK_ERROR || message.toLowerCase().includes("cannot reach");
  const isTimeout = message === TIMEOUT_ERROR  || message.toLowerCase().includes("timed out");

  const Icon = isNetwork ? WifiOff : isTimeout ? Clock : AlertCircle;
  const title = isNetwork
    ? "No connection"
    : isTimeout
    ? "Request timed out"
    : "Something went wrong";

  return (
    <div className={`flex flex-col items-center gap-3 py-10 px-6 text-center ${className ?? ""}`}>
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <Icon className="w-6 h-6 text-red-400" />
      </div>
      <div>
        <p className="font-semibold text-gray-800 text-sm">{title}</p>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      )}
    </div>
  );
}
