import React from 'react';
import Link from 'next/link';

export default function ShopPage() {
  const products = [
    {
      id: 1,
      name: 'Porsche 911 GT3 RS',
      category: 'Sports Car',
      price: '$241,300',
      image: 'https://loremflickr.com/800/600/sportscar?lock=1',
      badge: 'New Arrival'
    },
    {
      id: 2,
      name: 'Ducati Panigale V4',
      category: 'Superbike',
      price: '$24,495',
      image: 'https://loremflickr.com/800/600/superbike?lock=1',
      badge: 'Best Seller'
    },
    {
      id: 3,
      name: 'Range Rover SV',
      category: 'Luxury SUV',
      price: '$107,400',
      image: 'https://loremflickr.com/800/600/suv,luxury?lock=2',
      badge: null
    },
    {
      id: 4,
      name: 'BMW M1000 RR',
      category: 'Track Bike',
      price: '$38,740',
      image: 'https://loremflickr.com/800/600/motorcycle?lock=2',
      badge: 'Limited'
    }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Hero Header */}
      <div className="py-12 md:py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 drop-shadow-sm">
          Drive Your <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">
            Absolute Passion.
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg md:text-xl text-slate-500 mx-auto">
          Discover a curated collection of premium automobiles and superBikes designed for the true enthusiast. Step into the future of motion.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="#collection" className="rounded-full bg-slate-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-600 hover:shadow-indigo-500/25 transition-all duration-300 transform hover:-translate-y-1">
            Explore Collection
          </Link>
          <Link href="/chatbot" className="text-sm font-semibold leading-6 text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-2">
            Ask our AI <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Product Grid */}
      <div id="collection" className="mt-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Featured Exclusives</h2>
          <Link href="/cars" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
            View all <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
          {products.map((product) => (
            <div key={product.id} className="group relative flex flex-col bg-white rounded-3xl p-4 shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 hover:border-blue-100 transform hover:-translate-y-2">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100 group-hover:opacity-95 transition-opacity">
                {/* Fallback image style since actual images might be blocked in some envs */}
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${product.image}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {product.badge && (
                  <span className="absolute top-4 left-4 inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-3 py-0.5 text-xs font-bold text-slate-900 shadow-sm">
                    {product.badge}
                  </span>
                )}

                <Link href={`/products/${product.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')}`} className="absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 rounded-full bg-white/90 backdrop-blur-md px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-lg hover:bg-white hover:scale-105 active:scale-95 text-center">
                  Quick View
                </Link>
              </div>
              
              <div className="mt-6 flex flex-col flex-1 px-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-1">{product.category}</p>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{product.name}</h3>
                <div className="flex-1" />
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">{product.price}</p>
                  <Link href={`/products/${product.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')}`} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors border border-slate-200 hover:border-indigo-200">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
