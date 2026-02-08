import React, { useEffect, useState, useRef } from 'react';
import { SystemSettings, Trip } from '../types';
import { ShieldCheck, Printer, X, RefreshCw, FileDown } from 'lucide-react';
import { api } from '../services/api';
import { formatCPF } from '../lib/utils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface TripTicketProps {
  trip: Trip;
  onClose: () => void;
}

export const TripTicket: React.FC<TripTicketProps> = ({ trip, onClose }) => {
  const [settings, setSettings] = useState<SystemSettings>({ id: 'general', municipalityName: 'Prefeitura Municipal' });
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
        const s = await api.settings.get();
        setSettings(s);
    };
    load();
  }, []);

  const handlePrint = () => { window.print(); };

  const handleDownloadPDF = async () => {
      if (!printRef.current) return;
      setIsGenerating(true);
      try {
          const element = printRef.current;
          const canvas = await html2canvas(element, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: "#ffffff"
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`FICHA_VIAGEM_${trip.id.substring(0,8)}.pdf`);
      } catch (e) {
          console.error(e);
          alert("Erro ao gerar PDF");
      } finally {
          setIsGenerating(false);
      }
  };

  const LabelVal = ({ label, value, className = "" }: any) => (
      <div className={`flex flex-col ${className}`}>
          <span className="text-[8px] font-black text-gray-500 uppercase leading-none mb-1">{label}</span>
          <span className="text-[11px] font-black text-gray-900 uppercase break-words border-b border-gray-100 min-h-[14px] leading-tight">{value || '---'}</span>
      </div>
  );

  const KmBox = ({ label, value }: any) => (
      <div className="flex-1 border border-gray-200 rounded p-1 text-center bg-white">
          <p className="text-[7px] font-black text-gray-400 uppercase leading-tight">{label}</p>
          <p className="text-[13px] font-black text-gray-900 font-mono">{value || '0'}</p>
      </div>
  );

  const PrintCheckBox = ({ label, checked }: { label: string, checked: boolean }) => (
    <div className="flex items-center gap-1.5 py-0.5">
        <div className="w-3.5 h-3.5 border border-black flex items-center justify-center text-[10px] font-bold bg-white leading-none">
            {checked ? 'X' : ''}
        </div>
        <span className="text-[8px] uppercase font-bold text-gray-800">{label}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col h-screen print:static print:bg-white overflow-y-auto">
      <div className="flex-1 p-4 flex justify-center print:p-0">
          <div ref={printRef} className="printable-sheet bg-white w-[210mm] min-h-[297mm] p-[10mm] text-black shadow-2xl print:shadow-none mx-auto relative box-border font-sans">
            
            <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                <div className="flex items-center gap-3">
                    {settings.logoBase64 ? (
                      <img src={settings.logoBase64} className="h-12 w-auto object-contain" alt="Logo" />
                    ) : (
                      <ShieldCheck size={30} />
                    )}
                    <div>
                        <h1 className="text-xl font-black uppercase leading-none">{settings.municipalityName}</h1>
                        <p className="text-[10px] font-bold text-gray-600 uppercase">Secretaria Municipal de Saúde</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase border border-black px-2 py-0.5">FICHA DE CONTROLE OFICIAL</p>
                    <p className="text-[9px] font-mono mt-1 text-gray-400">ID: {trip.id.substring(0,12).toUpperCase()}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="border border-gray-300 rounded p-2">
                    <h2 className="text-[9px] font-black uppercase bg-gray-100 px-1 mb-2">1. Identificação Operacional</h2>
                    <div className="grid grid-cols-4 gap-4">
                        <LabelVal label="Veículo" value={trip.vehicleSnapshot} />
                        <LabelVal label="Tipo" value={trip.type} />
                        <LabelVal label="Condutor" value={trip.driverName} />
                        <LabelVal label="Responsável" value={trip.responsavel} className="col-span-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <LabelVal label="Solicitante Origem" value={trip.solicitante} />
                        <LabelVal label="Solicitante 2" value={trip.solicitante2 || '---'} />
                    </div>
                </div>

                <div className="border border-gray-300 rounded p-2">
                    <h2 className="text-[9px] font-black uppercase bg-gray-100 px-1 mb-2">2. Itinerário e Dados do Translado</h2>
                    <div className="grid grid-cols-1 gap-2 mb-3">
                        <LabelVal label="Unidade Destino" value={trip.destinationUnit} />
                        <div className="grid grid-cols-3 gap-2">
                            <LabelVal label="Itinerário 1" value={trip.destination} />
                            <LabelVal label="Itinerário 2" value={trip.destination2} />
                            <LabelVal label="Itinerário 3" value={trip.destination3} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-2 border-dashed">
                        <div className="grid grid-cols-2 gap-2">
                            <LabelVal label="Saída Oficial" value={`${new Date(trip.dateOut).toLocaleDateString()} ${trip.timeOut}`} />
                            <KmBox label="KM Saída" value={trip.kmOut} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <LabelVal label="Chegada Real" value={trip.dateReturn ? `${new Date(trip.dateReturn).toLocaleDateString()} ${trip.timeReturn}` : '___/___/___ ___:___'} />
                            <KmBox label="KM Chegada" value={trip.kmIn} />
                        </div>
                    </div>
                </div>

                <div className="border border-black rounded p-2 shadow-sm">
                    <h2 className="text-[9px] font-black uppercase bg-black text-white px-1 mb-2">3. Ocupantes (Pacientes / Passageiros)</h2>
                    {trip.patient?.name ? (
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <LabelVal label="Paciente" value={trip.patient.name} />
                                </div>
                                <LabelVal label="Nascimento" value={trip.patient.birthDate} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <LabelVal label="CPF" value={formatCPF(trip.patient.cpf)} />
                                <LabelVal label="Cartão SUS" value={trip.patient.cartaoSus} />
                                <LabelVal label="Telefone" value={trip.patient.telefone} />
                            </div>
                            {trip.patient.hasCompanion && (
                                <div className="bg-gray-50 p-1 border border-dashed grid grid-cols-3 gap-2">
                                    <LabelVal label="Acompanhante" value={trip.patient.companionName} />
                                    <LabelVal label="CPF Acomp." value={formatCPF(trip.patient.companionCpf || '')} />
                                    <LabelVal label="Fone Acomp." value={trip.patient.companionPhone} />
                                </div>
                            )}
                            <LabelVal label="Endereço" value={trip.patient.endereco} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-1">
                            <div className="grid grid-cols-12 gap-1 text-[7px] font-black uppercase bg-gray-50 border-b p-0.5">
                                <div className="col-span-1">Vaga</div>
                                <div className="col-span-5">Nome Completo</div>
                                <div className="col-span-2">CPF</div>
                                <div className="col-span-2">SUS</div>
                                <div className="col-span-2 text-right">Nasc.</div>
                            </div>
                            {trip.passengerList?.filter(p=>p.name).map((p, i) => (
                                <div key={i} className="grid grid-cols-12 gap-1 text-[9px] border-b border-gray-100 py-0.5 items-center">
                                    <div className="col-span-1 font-bold text-gray-400">{i+1}</div>
                                    <div className="col-span-5 font-black uppercase">{p.name}</div>
                                    <div className="col-span-2 font-mono">{formatCPF(p.cpf)}</div>
                                    <div className="col-span-2 font-mono">{p.susCard || '---'}</div>
                                    <div className="col-span-2 text-right">{p.birthDate}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-300 rounded p-2">
                        <h2 className="text-[9px] font-black uppercase bg-gray-100 px-1 mb-2">4. Vistoria Pré-Viagem</h2>
                        <div className="grid grid-cols-2 gap-x-2">
                            <PrintCheckBox label="Estepe" checked={!!trip.tripChecklist?.estepe} />
                            <PrintCheckBox label="Macaco" checked={!!trip.tripChecklist?.macaco} />
                            <PrintCheckBox label="Chave Roda" checked={!!trip.tripChecklist?.chaveroda} />
                            <PrintCheckBox label="Triângulo" checked={!!trip.tripChecklist?.triângulo} />
                            <PrintCheckBox label="Extintor" checked={!!trip.tripChecklist?.extintor} />
                            <PrintCheckBox label="Cilindro O2" checked={!!trip.tripChecklist?.cilindroo2} />
                        </div>
                    </div>
                    <div className="border border-gray-300 rounded p-2">
                        <h2 className="text-[9px] font-black uppercase bg-gray-100 px-1 mb-2">5. Observações</h2>
                        <div className="h-16 border-b border-gray-100"></div>
                    </div>
                </div>

                <div className="pt-16 grid grid-cols-2 gap-16 px-8 text-center">
                    <div className="border-t border-black pt-1">
                        <p className="text-[9px] font-black uppercase">{trip.driverName}</p>
                        <p className="text-[7px] font-bold text-gray-500 uppercase">Assinatura do Condutor</p>
                    </div>
                    <div className="border-t border-black pt-1">
                        <p className="text-[9px] font-black uppercase">Responsável da Unidade</p>
                        <p className="text-[7px] font-bold text-gray-500 uppercase">Carimbo e Assinatura</p>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-10 right-10 text-[6px] text-gray-300 flex justify-between uppercase tracking-widest border-t pt-1">
                <span>Frotapro Gov v5.2</span>
                <span>Documento Controlado - Emitido em {new Date().toLocaleString()}</span>
            </div>
          </div>
      </div>

      <div className="bg-gray-800 p-6 flex justify-between items-center print:hidden border-t border-white/10 shadow-2xl">
        <div className="text-white">
            <h2 className="font-black uppercase text-sm tracking-widest leading-none">Visualização de Documento</h2>
            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Imprima ou salve o documento oficial.</p>
        </div>
        <div className="flex gap-4">
            <button 
                onClick={handleDownloadPDF} 
                disabled={isGenerating}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center shadow-lg disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="animate-spin mr-2" size={16}/> : <FileDown size={16} className="mr-2"/>}
              {isGenerating ? "Gerando..." : "Baixar PDF"}
            </button>
            <button onClick={handlePrint} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center shadow-lg">
              <Printer size={16} className="mr-2"/> Imprimir
            </button>
            <button onClick={onClose} className="p-3 text-gray-400 hover:text-white transition-all"><X size={28} /></button>
        </div>
      </div>
    </div>
  );
};