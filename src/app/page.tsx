import React from "react";
import {
  ShieldCheck,
  Check,
  Lock,
  Sparkles,
  PackageCheck,
  CheckCircle,
  Boxes,
  TrendingUp,
  Clock4,
} from "lucide-react";

interface PublicDistribution {
  id: string;
  receivedAt: string;
  qrToken: string;
  posko: string;
  item: string;
  qty: number;
  sealCode: string;
  geoStatus: string;
  status: "VERIFIED";
}

const MOCK_DISTRIBUTIONS: PublicDistribution[] = [
  {
    id: "DIST-001",
    receivedAt: "14:25 WIB",
    qrToken: "SIBANTU-REQ-001-K9X2****",
    posko: "Posko 01 - Cugenang (Desa Gasol) • Zona Merah",
    item: "Makanan Bayi & Balita (Kotak Nutrisi Siap Santap)",
    qty: 50,
    sealCode: "SGL-4821",
    geoStatus: "[GEO-VALID]",
    status: "VERIFIED",
  },
  {
    id: "DIST-002",
    receivedAt: "13:40 WIB",
    qrToken: "SIBANTU-REQ-002-M4B7****",
    posko: "Posko 02 - Nagrak (Kec. Cianjur) • Zona Kuning",
    item: "Selimut Tebal & Matras (Pcs Perlengkapan Hangat)",
    qty: 40,
    sealCode: "SGL-7719",
    geoStatus: "[GEO-VALID]",
    status: "VERIFIED",
  },
  {
    id: "DIST-003",
    receivedAt: "11:15 WIB",
    qrToken: "SIBANTU-REQ-003-P2R9****",
    posko: "Posko 03 - Ciherang (Pacet) • Zona Hijau",
    item: "Beras Premium 10kg (Sak Bahan Pokok)",
    qty: 60,
    sealCode: "SGL-3341",
    geoStatus: "[GEO-VALID]",
    status: "VERIFIED",
  },
  {
    id: "DIST-004",
    receivedAt: "09:30 WIB",
    qrToken: "SIBANTU-REQ-004-W8L1****",
    posko: "Posko 01 - Cugenang (Desa Gasol) • Zona Merah",
    item: "Paket Obat Darurat & P3K (Box Medis Lapangan)",
    qty: 30,
    sealCode: "SGL-9204",
    geoStatus: "[GEO-VALID]",
    status: "VERIFIED",
  },
  {
    id: "DIST-005",
    receivedAt: "08:10 WIB",
    qrToken: "SIBANTU-REQ-005-T5K3****",
    posko: "Posko 02 - Nagrak (Kec. Cianjur) • Zona Kuning",
    item: "Air Mineral Galon 19L (Galon Higienis)",
    qty: 50,
    sealCode: "SGL-6582",
    geoStatus: "[GEO-VALID]",
    status: "VERIFIED",
  },
];

export default function Home() {
  const totalIn = 850;
  const totalDistributed = MOCK_DISTRIBUTIONS.reduce((acc, cur) => acc + cur.qty, 0);
  const remainingStock = totalIn - totalDistributed;
  const fulfillmentRate = Math.round((totalDistributed / totalIn) * 100);

  return (
    <section id="view-publik" className="gov-view-panel">
      {/* Official Notice Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-teal-700/40 mb-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-teal-500/20 text-teal-200 border border-teal-500/30 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
            <span>Portal Keterbukaan Informasi Publik • UU KIP No. 14/2008</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Keterbukaan Distribusi Logistik Darurat Bencana
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
            Pemerintah Kabupaten Cianjur memastikan setiap paket bantuan kemanusiaan tersalurkan secara terverifikasi
            dengan validasi fisik ganda, pembuktian geolokasi, dan pencatatan audit yang tidak dapat dimanipulasi.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-teal-200/90 font-medium">
            <span className="flex items-center">
              <Check className="w-4 h-4 mr-1 text-emerald-400" /> Data Publik Teragregasi
            </span>
            <span className="flex items-center">
              <Lock className="w-4 h-4 mr-1 text-emerald-400" /> Kepatuhan UU PDP (Data Pribadi Terlindungi)
            </span>
            <span className="flex items-center">
              <Sparkles className="w-4 h-4 mr-1 text-amber-300" /> Zero Fake Reports Protocol
            </span>
          </div>
        </div>
      </div>

      {/* Public Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total In */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Total Bantuan Masuk
            </div>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2" id="pub-total-in">
            {totalIn}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center">
            <span className="text-teal-700 font-semibold mr-1">Tercatat</span> di Gudang Induk Logistik
          </div>
        </div>

        {/* Distributed */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Tersalurkan Sah (Received)
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 mt-2" id="pub-total-distributed">
            {totalDistributed} unit
          </div>
          <div className="text-xs text-emerald-700 mt-1 flex items-center font-medium">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Terbukti lolos validasi segel posko
          </div>
        </div>

        {/* Stock Remaining */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Sisa Stok Siap Salur
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-blue-700 mt-2" id="pub-stock-remaining">
            {remainingStock} unit
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center">
            Tersimpan aman berdasarkan FEFO
          </div>
        </div>

        {/* Fulfillment Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Rasio Pemenuhan Kebutuhan
            </div>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-purple-700 mt-2" id="pub-fulfillment-rate">
            {fulfillmentRate}%
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center">
            Target standar penanganan darurat
          </div>
        </div>
      </div>

      {/* Public Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-800 text-base">Buku Transparansi Penyaluran Logistik Bencana</h2>
            <p className="text-xs text-slate-500">
              Hanya menampilkan riwayat distribusi yang telah lolos verifikasi serah terima fisik (Closed-Loop Verified).
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-semibold">
              <Lock className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Audit Terjamin Kriptografis
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Waktu Penerimaan</th>
                <th className="px-5 py-3">ID Transaksi Publik</th>
                <th className="px-5 py-3">Posko Penerima</th>
                <th className="px-5 py-3">Komoditas Barang</th>
                <th className="px-5 py-3">Jumlah Sah</th>
                <th className="px-5 py-3">Validasi Fisik &amp; Geo</th>
                <th className="px-5 py-3 text-right">Status Kepatuhan</th>
              </tr>
            </thead>
            <tbody id="public-received-table" className="divide-y divide-slate-100 text-xs">
              {MOCK_DISTRIBUTIONS.map((dist) => (
                <tr key={dist.id} className="hover:bg-slate-50 transition border-b border-slate-100">
                  <td className="px-5 py-3.5 font-mono text-slate-600">{dist.receivedAt}</td>
                  <td className="px-5 py-3.5 font-mono font-bold text-teal-800">{dist.qrToken}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{dist.posko}</td>
                  <td className="px-5 py-3.5 text-slate-900 font-semibold">{dist.item}</td>
                  <td className="px-5 py-3.5 font-bold text-emerald-700">{dist.qty} unit</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-1 text-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-mono text-[11px] font-bold">
                        #{dist.sealCode} {dist.geoStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                      {dist.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {MOCK_DISTRIBUTIONS.length === 0 && (
          <div id="public-empty-notice" className="p-12 text-center text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Clock4 className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">
              Belum Ada Catatan Penyaluran Berstatus RECEIVED
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Data penyaluran sah akan otomatis muncul di sini setelah petugas posko lapangan memindai QR dan
              memverifikasi kode segel pada Terminal Serah Terima.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
