import type { ReactNode } from "react";

type IllustratedEmptyStateProps = {
  image: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function IllustratedEmptyState({ image, title, description, action }: IllustratedEmptyStateProps) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 py-10 text-center">
      <img src={image} alt="" aria-hidden="true" className="mb-4 h-auto w-full max-w-[180px] object-contain" />
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 max-w-xs text-sm leading-5 text-gray-500">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
