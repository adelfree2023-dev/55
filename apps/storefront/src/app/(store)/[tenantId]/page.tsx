import { getHomePageData } from '@/lib/api';
import { notFound } from 'next/navigation';

interface PageProps {
    params: {
        tenantId: string;
    };
}

// This is a Server Component (default in Next.js 16 App Router)
export default async function HomePage({ params }: PageProps) {
    const { tenantId } = params;

    try {
        const data = await getHomePageData(tenantId);

        if (!data) {
            notFound();
        }

        return (
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                {data.tenant.logoUrl && (
                                    <img
                                        src={data.tenant.logoUrl}
                                        alt={`${data.tenant.name} logo`}
                                        className="h-10 w-auto mr-4"
                                    />
                                )}
                                <h1 className="text-2xl font-bold" style={{ color: data.tenant.primaryColor || '#3B82F6' }}>
                                    {data.tenant.name}
                                </h1>
                            </div>
                            <nav className="flex gap-6">
                                <a href="#" className="text-gray-700 hover:text-primary">Home</a>
                                <a href="#" className="text-gray-700 hover:text-primary">Products</a>
                                <a href="#" className="text-gray-700 hover:text-primary">Categories</a>
                                <a href="#" className="text-gray-700 hover:text-primary">Cart</a>
                            </nav>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main>
                    {/* Hero Banner */}
                    {data.sections.hero.length > 0 && (
                        <section className="relative h-96 bg-gray-800">
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${data.sections.hero[0].image_url})` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
                            </div>
                            <div className="relative h-full flex items-center px-4 md:px-16">
                                <div className="max-w-2xl text-white">
                                    <h2 className="text-4xl md:text-6xl font-bold mb-4">
                                        {data.sections.hero[0].title}
                                    </h2>
                                    {data.sections.hero[0].subtitle && (
                                        <p className="text-xl md:text-2xl mb-8 opacity-90">
                                            {data.sections.hero[0].subtitle}
                                        </p>
                                    )}
                                    {data.sections.hero[0].cta_text && (
                                        <a
                                            href={data.sections.hero[0].cta_url || '#'}
                                            className="inline-block bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                                        >
                                            {data.sections.hero[0].cta_text}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Best Sellers */}
                    {data.sections.bestSellers.length > 0 && (
                        <section className="py-16 px-4 md:px-16">
                            <h2 className="text-3xl font-bold mb-8">Best Sellers</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {data.sections.bestSellers.slice(0, 8).map((product) => (
                                    <div key={product.id} className="card">
                                        {product.image_url && (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-full h-48 object-cover rounded-t-lg mb-4"
                                            />
                                        )}
                                        <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                                        {product.description && (
                                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-2xl font-bold text-primary">${product.price}</span>
                                            <button className="btn-primary text-sm py-2 px-4">Add to Cart</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Featured Categories */}
                    {data.sections.categories.length > 0 && (
                        <section className="py-16 px-4 md:px-16 bg-white">
                            <h2 className="text-3xl font-bold mb-8">Shop by Category</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                {data.sections.categories.map((category) => (
                                    <a
                                        key={category.id}
                                        href={`/${tenantId}/category/${category.slug}`}
                                        className="text-center group"
                                    >
                                        {category.image_url && (
                                            <div className="mb-2 overflow-hidden rounded-lg">
                                                <img
                                                    src={category.image_url}
                                                    alt={category.name}
                                                    className="w-full h-32 object-cover group-hover:scale-110 transition-transform"
                                                />
                                            </div>
                                        )}
                                        <h3 className="font-semibold">{category.name}</h3>
                                        {category.product_count && (
                                            <p className="text-sm text-gray-500">{category.product_count} products</p>
                                        )}
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Promotions */}
                    {data.sections.promotions.length > 0 && (
                        <section className="py-16 px-4 md:px-16">
                            <h2 className="text-3xl font-bold mb-8">Special Offers</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {data.sections.promotions.map((promo) => (
                                    <div key={promo.id} className="card bg-gradient-to-br from-primary-light to-primary">
                                        {promo.banner_url && (
                                            <img
                                                src={promo.banner_url}
                                                alt={promo.title}
                                                className="w-full h-32 object-cover rounded-t-lg mb-4"
                                            />
                                        )}
                                        <div className="text-white">
                                            <h3 className="text-xl font-bold mb-2">{promo.title}</h3>
                                            {promo.description && (
                                                <p className="text-sm mb-4 opacity-90">{promo.description}</p>
                                            )}
                                            {promo.discount_percent && (
                                                <div className="text-3xl font-bold">{promo.discount_percent}% OFF</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Testimonials */}
                    {data.sections.testimonials.length > 0 && (
                        <section className="py-16 px-4 md:px-16 bg-white">
                            <h2 className="text-3xl font-bold mb-8">What Our Customers Say</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {data.sections.testimonials.slice(0, 6).map((testimonial) => (
                                    <div key={testimonial.id} className="card">
                                        <div className="flex items-center mb-4">
                                            <div className="flex text-yellow-400">
                                                {[...Array(5)].map((_, i) => (
                                                    <svg
                                                        key={i}
                                                        className={`w-5 h-5 ${i < testimonial.rating ? 'fill-current' : 'fill-gray-300'}`}
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                                    </svg>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-gray-700 mb-4 italic">"{testimonial.review_text}"</p>
                                        <div className="text-sm">
                                            <div className="font-semibold">{testimonial.customer_name}</div>
                                            {testimonial.product_name && (
                                                <div className="text-gray-500">on {testimonial.product_name}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                {/* Footer */}
                <footer className="bg-gray-900 text-white py-12 px-4 md:px-16">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div>
                                <h3 className="font-bold text-lg mb-4">{data.tenant.name}</h3>
                                <p className="text-gray-400 text-sm">
                                    Your trusted e-commerce partner
                                </p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-4">Quick Links</h4>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li><a href="#" className="hover:text-white">About Us</a></li>
                                    <li><a href="#" className="hover:text-white">Contact</a></li>
                                    <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-4">Customer Service</h4>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li><a href="#" className="hover:text-white">FAQs</a></li>
                                    <li><a href="#" className="hover:text-white">Shipping Info</a></li>
                                    <li><a href="#" className="hover:text-white">Returns</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-4">Follow Us</h4>
                                <div className="flex gap-4">
                                    <a href="#" className="text-gray-400 hover:text-white">Facebook</a>
                                    <a href="#" className="text-gray-400 hover:text-white">Twitter</a>
                                    <a href="#" className="text-gray-400 hover:text-white">Instagram</a>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
                            © {new Date().getFullYear()} {data.tenant.name}. All rights reserved.
                        </div>
                    </div>
                </footer>
            </div>
        );
    } catch (error) {
        console.error('Error loading home page:', error);
        notFound();
    }
}
