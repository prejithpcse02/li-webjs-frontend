import Link from "next/link";

export default function Home() {
  return (
    <section className="w-screen h-screen flex justify-center items-center bg-gray-100 text-gray-700 p-6">
      <div className="flex flex-col justify-center items-center gap-4">
        <span className="text-5xl font-bold text-blue-600">Listtra 👋</span>
        <span className="text-lg text-gray-700 text-center">
          Discover amazing listings with just one tap!
        </span>
        <Link
          href="/auth/signin"
          className="w-fit px-3 py-2 rounded-md bg-blue-600 text-white"
        >
          Explore Items ➡
        </Link>
      </div>
    </section>
  );
}
