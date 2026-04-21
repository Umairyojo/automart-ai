export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full relative flex flex-col justify-center overflow-hidden bg-slate-900">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600 opacity-20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600 opacity-20 blur-[120px] pointer-events-none" />
      
      {/* Content wrapper */}
      <div className="relative z-10 w-full flex justify-center py-12 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
