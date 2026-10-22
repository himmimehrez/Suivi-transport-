import React, { useState, useEffect } from 'react';
import { TransportRequest } from '../types/index.ts';
import { X, Camera, QrCode, Upload, CheckCircle2, AlertCircle, FileText, Check } from 'lucide-react';
import QRCode from 'qrcode';

interface BarcodeScannerModalProps {
  mission: TransportRequest;
  docType: 'BON_DE_LIVRAISON' | 'PREUVE_DE_LIVRAISON_POD';
  onClose: () => void;
  onSuccess: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  mission,
  docType,
  onClose,
  onSuccess,
}) => {
  const isPOD = docType === 'PREUVE_DE_LIVRAISON_POD';
  const defaultBlNumber = isPOD ? `POD-${mission.requestRef}` : `BL-${mission.requestRef}`;

  const [activeTab, setActiveTab] = useState<'SCAN' | 'UPLOAD' | 'MANUAL'>('SCAN');
  const [scannedData, setScannedData] = useState<string>('');
  const [blNumber, setBlNumber] = useState<string>(defaultBlNumber);
  const [recipientName, setRecipientName] = useState<string>(mission.deliveryContactName || '');
  const [recipientTitle, setRecipientTitle] = useState<string>('Responsable Réception Magasin');
  const [notes, setNotes] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [demoQrDataUrl, setDemoQrDataUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [stepSuccess, setStepSuccess] = useState<boolean>(false);

  // Generate demo QR code for this specific mission
  useEffect(() => {
    const payload = `${defaultBlNumber}|${mission.requestRef}|${mission.goodsType}|${mission.totalWeightTons}T`;
    QRCode.toDataURL(payload, { width: 180, margin: 1 })
      .then((url) => setDemoQrDataUrl(url))
      .catch((err) => console.error('Failed to generate test QR:', err));
  }, [mission, defaultBlNumber]);

  const handleSimulateScan = () => {
    const payload = `${defaultBlNumber}|${mission.requestRef}|${mission.goodsType}|${mission.totalWeightTons}T`;
    setScannedData(payload);
    setBlNumber(defaultBlNumber);
    setErrorMsg(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
        if (!scannedData) {
          setScannedData(`FILE:${file.name}|${mission.requestRef}`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Strict validation
    if (scannedData && scannedData.includes('TR-') && !scannedData.includes(mission.requestRef)) {
      setErrorMsg(`Erreur de concordance: Ce document ne correspond pas à la mission active (${mission.requestRef}).`);
      return;
    }

    if (!blNumber.trim()) {
      setErrorMsg('Veuillez renseigner le numéro du document.');
      return;
    }

    if (isPOD && !recipientName.trim()) {
      setErrorMsg('Le nom du réceptionnaire est requis pour la preuve de livraison finale.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/transport-requests/${mission.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blNumber: blNumber.trim(),
          barcodeOrQrData: scannedData || `${blNumber}|${mission.requestRef}`,
          docType,
          fileName: isPOD ? `Preuve_POD_${mission.requestRef}.pdf` : `Bon_Livraison_${mission.requestRef}.pdf`,
          fileUrl: photoPreview,
          notes: notes || (isPOD ? 'Marchandise réceptionnée et contrôlée sans réserve.' : 'Chargement vérifié et arrimé.'),
          recipientName: isPOD ? recipientName : undefined,
          recipientSignature: isPOD ? `Signé par ${recipientName} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : undefined,
          recipientTitle: isPOD ? recipientTitle : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’enregistrement du document.');
      }

      setStepSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg text-slate-950 font-bold">
              {isPOD ? <CheckCircle2 className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base">
                {isPOD ? 'Enregistrer la Preuve de Livraison (POD)' : 'Scanner le Bon de Livraison (BL)'}
              </h3>
              <p className="text-xs text-slate-300">Mission {mission.requestRef}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('SCAN')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'SCAN'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            Scanner Caméra / QR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('UPLOAD')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'UPLOAD'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            Photo / Document
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MANUAL')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'MANUAL'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Saisie Manuelle
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {stepSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-sm font-semibold">
              <Check className="w-5 h-5 text-emerald-600" />
              Document validé et rattaché avec succès !
            </div>
          )}

          {/* TAB 1: SCAN */}
          {activeTab === 'SCAN' && (
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-xl p-4 text-center text-white relative overflow-hidden">
                <div className="border-2 border-dashed border-amber-400/70 rounded-lg p-6 flex flex-col items-center justify-center min-h-[160px]">
                  {demoQrDataUrl ? (
                    <img src={demoQrDataUrl} alt="QR Code Test" className="w-28 h-28 rounded-md bg-white p-1" />
                  ) : (
                    <Camera className="w-12 h-12 text-slate-500 animate-pulse" />
                  )}
                  <p className="text-xs text-slate-300 mt-2">
                    Cadrez le QR code ou code-barres imprimé sur le bon de transport
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSimulateScan}
                  className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  Détecter / Scanner le QR code
                </button>
              </div>

              {scannedData && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-500 block">Référence détectée :</span>
                  <span className="font-mono font-bold text-slate-900 break-all">{scannedData}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD */}
          {activeTab === 'UPLOAD' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Photo du document ou fichier PDF
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-amber-500 transition cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-2">
                  Prenez une photo nette du document tamponné ou importez le récépissé numérique
                </p>
              </div>

              {photoPreview && (
                <div className="p-2 border border-slate-200 rounded-lg">
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1">Aperçu du document:</span>
                  <img src={photoPreview} alt="Aperçu" className="max-h-32 rounded object-cover mx-auto" />
                </div>
              )}
            </div>
          )}

          {/* Common Fields */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Numéro de référence officiel ({isPOD ? 'Preuve POD' : 'BL / Récépissé'})
              </label>
              <input
                type="text"
                required
                value={blNumber}
                onChange={(e) => setBlNumber(e.target.value)}
                placeholder="Ex: BL-2026-DZ-994"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            {isPOD && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom du réceptionnaire
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Nom & Prénom"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Qualité / Poste
                  </label>
                  <input
                    type="text"
                    value={recipientTitle}
                    onChange={(e) => setRecipientTitle(e.target.value)}
                    placeholder="Ex: Chef Magasinier"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remarques & réserves éventuelles
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Palettes intactes, température conforme..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || stepSuccess}
              className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition flex items-center gap-2"
            >
              {loading ? 'Validation...' : isPOD ? 'Valider la Preuve & Clôturer Livraison' : 'Valider le Bon de Livraison'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
