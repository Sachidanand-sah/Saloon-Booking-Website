import Link from 'next/link';
import { Service } from '../types';
import Button from '../components/ui/Button';

const SERVICES: Service[] = [
  {
    id: 'haircut',
    title: 'Precision Haircut',
    description: 'Expert styling tailored to your face shape and lifestyle.',
    durationMins: 45,
    price: 35,
  },
  {
    id: 'facial',
    title: 'Glow Facial',
    description: 'Deep cleansing and hydration for radiant, youthful skin.',
    durationMins: 60,
    price: 55,
  },
  {
    id: 'manicure',
    title: 'Gel Manicure',
    description: 'Long-lasting color and care for elegant hands.',
    durationMins: 45,
    price: 30,
  },
  {
    id: 'massage',
    title: 'Aromatherapy Massage',
    description: 'Relax and unwind with essential oils and gentle pressure.',
    durationMins: 60,
    price: 70,
  },
];

export default function HomePage() {
  return (
    <main className="space-y-24">
      <section className="relative py-20 lg:py-32 overflow-hidden rounded-3xl bg-pink-900 isolate">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-800 to-gray-900 opacity-90"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-pink-800 to-gray-900 opacity-90"></div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow"></div>
        </div>

        <div className="relative mx-auto max-w-2xl text-center px-6">
          <h1 className="text-4xl font-display font-bold tracking-tight text-white sm:text-6xl animate-fade-in">
            Lovely Glow <br />
            <span className="text-pink-200">Beauty Salon</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Experience world-class beauty treatments in a serene environment. 
            We bring out your inner glow with precision and care.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link href="/services">
              <Button size="lg" className="rounded-full shadow-lg shadow-pink-500/25">
                Book Appointment
              </Button>
            </Link>
            <Link href="/login" className="text-sm font-semibold leading-6 text-white hover:text-pink-200 transition">
              Log In
            </Link>
            <span className="text-gray-500">|</span>
            <Link href="/signup" className="text-sm font-semibold leading-6 text-white hover:text-pink-200 transition">
              Sign Up <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="text-center max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-display font-bold text-gray-900">Why Choose Us?</h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-pink-50 rounded-2xl">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="font-bold text-lg">Expert Stylists</h3>
            <p className="text-sm text-gray-600 mt-2">Certified professionals with years of experience.</p>
          </div>
          <div className="p-6 bg-pink-50 rounded-2xl">
            <div className="text-4xl mb-4">🌿</div>
            <h3 className="font-bold text-lg">Premium Products</h3>
            <p className="text-sm text-gray-600 mt-2">We use only the finest organic and skin-safe products.</p>
          </div>
          <div className="p-6 bg-pink-50 rounded-2xl">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="font-bold text-lg">Easy Booking</h3>
            <p className="text-sm text-gray-600 mt-2">Book 24/7 online with instant confirmation.</p>
          </div>
        </div>
      </section>

      <section className="px-6">
        <div className="flex justify-between items-end mb-8">
          <div>
             <h2 className="text-3xl font-display font-bold text-gray-900">Popular Services</h2>
             <p className="text-gray-600 mt-2">Our most requested treatments this month.</p>
          </div>
          <Link href="/services" className="hidden sm:block text-pink-600 font-medium hover:text-pink-700">
            View All Services →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SERVICES.map((service) => (
            <div
              key={service.id}
              className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <h3 className="text-xl font-bold font-display group-hover:text-pink-600 transition-colors">{service.title}</h3>
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                {service.description}
              </p>

              <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-50">
                <div className="flex flex-col">
                   <span className="text-lg font-bold text-gray-900">${service.price}</span>
                   <span className="text-xs text-gray-400">{service.durationMins} mins</span>
                </div>

                <Link href={`/book/${service.id}`}>
                  <Button size="sm" variant="secondary" className="group-hover:bg-pink-600 group-hover:text-white transition-colors">
                    Book
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 text-center sm:hidden">
            <Link href="/services" className="text-pink-600 font-medium">
                View All Services →
            </Link>
        </div>
      </section>

      <section className="bg-pink-50 py-16 rounded-3xl mx-6">
        <div className="max-w-4xl mx-auto px-6 text-center">
           <h2 className="text-3xl font-display font-bold text-gray-900 mb-10">Client Stories</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="bg-white p-6 rounded-xl shadow-sm">
               <div className="flex justify-center mb-4 text-pink-400">★★★★★</div>
               <p className="text-gray-600 italic mb-4">"Absolutely the best facial I've ever had. My skin is glowing!"</p>
               <h4 className="font-bold text-gray-900">— Sarah M.</h4>
             </div>
             <div className="bg-white p-6 rounded-xl shadow-sm">
               <div className="flex justify-center mb-4 text-pink-400">★★★★★</div>
               <p className="text-gray-600 italic mb-4">"Professional staff and such a relaxing atmosphere. Highly recommend."</p>
               <h4 className="font-bold text-gray-900">— Emily R.</h4>
             </div>
             <div className="bg-white p-6 rounded-xl shadow-sm scale-105 border-2 border-pink-100">
               <div className="flex justify-center mb-4 text-pink-400">★★★★★</div>
               <p className="text-gray-600 italic mb-4">"I book my appointments online in seconds. So convenient and easy!"</p>
               <h4 className="font-bold text-gray-900">— Jessica T.</h4>
             </div>
           </div>
        </div>
      </section>

      <section className="py-12 border-t border-gray-100 mt-12 mx-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center bg-gray-900 text-white rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="z-10 relative">
            <h2 className="text-2xl font-bold font-display mb-2">Salon Staff Portal</h2>
            <p className="text-gray-400 max-w-md">Manage appointments, schedules, and services efficiently.</p>
          </div>
          <div className="z-10 relative mt-6 md:mt-0">
             <Link href="/admin">
               <Button variant="primary" className="bg-white text-gray-900 hover:bg-gray-100 border-none">
                 Access Dashboard
               </Button>
             </Link>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-600 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
        </div>
      </section>
    </main>
  );
}
