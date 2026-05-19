import {
  FolderKanban,
  CreditCard,
  FileText,
  Bell,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0D] text-white flex">
      
      {/* Sidebar */}
      <aside className="w-72 bg-[#111113] border-r border-[#1E1E22] p-6">
        
        <div className="mb-12">
          <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-2">
            ALFA IT
          </p>

          <h1 className="text-2xl font-bold">
            Portal Cliente
          </h1>
        </div>

        <nav className="space-y-4">

          <div className="flex items-center gap-3 bg-[#1A1A1D] p-3 rounded-xl">
            <FolderKanban size={20} />
            <span>Proyectos</span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl text-[#B3B3B8]">
            <FileText size={20} />
            <span>Cotizaciones</span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl text-[#B3B3B8]">
            <CreditCard size={20} />
            <span>Pagos</span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl text-[#B3B3B8]">
            <Bell size={20} />
            <span>Notificaciones</span>
          </div>

        </nav>
      </aside>

      {/* Content */}
      <section className="flex-1 p-10">

        <div className="mb-10">
          <h2 className="text-4xl font-bold mb-2">
            Bienvenido, Leonardo
          </h2>

          <p className="text-[#B3B3B8]">
            Aquí puedes revisar tus proyectos y avances.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-6 mb-10">

          <div className="bg-[#151518] p-6 rounded-2xl border border-[#1F1F24]">
            <p className="text-[#B3B3B8] mb-2">
              Proyectos activos
            </p>

            <h3 className="text-4xl font-bold">
              4
            </h3>
          </div>

          <div className="bg-[#151518] p-6 rounded-2xl border border-[#1F1F24]">
            <p className="text-[#B3B3B8] mb-2">
              Cotizaciones pendientes
            </p>

            <h3 className="text-4xl font-bold">
              2
            </h3>
          </div>

          <div className="bg-[#151518] p-6 rounded-2xl border border-[#1F1F24]">
            <p className="text-[#B3B3B8] mb-2">
              Saldo pendiente
            </p>

            <h3 className="text-4xl font-bold">
              $130K
            </h3>
          </div>

        </div>

        {/* Projects */}
        <div>
          <h3 className="text-2xl font-semibold mb-6">
            Tus proyectos
          </h3>

          <div className="space-y-5">

            <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xl font-semibold">
                    Residencia Lomas Altas
                  </h4>

                  <p className="text-[#B3B3B8]">
                    Sistema de CCTV y Red
                  </p>
                </div>

                <span className="bg-[#9E1B32] px-4 py-2 rounded-full text-sm">
                  En proceso
                </span>
              </div>

              <div className="w-full bg-[#222228] h-3 rounded-full mb-3">
                <div className="bg-[#9E1B32] h-3 rounded-full w-[65%]" />
              </div>

              <p className="text-[#B3B3B8] text-sm">
                Avance del proyecto: 65%
              </p>

            </div>

          </div>
        </div>

      </section>
    </main>
  );
}