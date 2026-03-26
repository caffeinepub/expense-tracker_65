import { Category } from "../backend.d";

const CATEGORY_CONFIG: Record<Category, { label: string; className: string }> =
  {
    [Category.food]: {
      label: "Food",
      className: "bg-orange-100 text-orange-700 border-orange-200",
    },
    [Category.transport]: {
      label: "Transport",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    [Category.housing]: {
      label: "Housing",
      className: "bg-purple-100 text-purple-700 border-purple-200",
    },
    [Category.entertainment]: {
      label: "Entertainment",
      className: "bg-pink-100 text-pink-700 border-pink-200",
    },
    [Category.health]: {
      label: "Health",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    [Category.shopping]: {
      label: "Shopping",
      className: "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
    [Category.other]: {
      label: "Other",
      className: "bg-gray-100 text-gray-600 border-gray-200",
    },
  };

export function getCategoryConfig(category: Category) {
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG[Category.other];
}

interface Props {
  category: Category;
  className?: string;
}

export function CategoryBadge({ category, className }: Props) {
  const config = getCategoryConfig(category);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        config.className
      } ${className ?? ""}`}
    >
      {config.label}
    </span>
  );
}
