import CategoryPage from "@/components/CategoryPage";

export const revalidate = 86400;

export default function MoviesPage() {
  return <CategoryPage type="movie" />;
}
