import React, { useState, useEffect } from 'react';
import { Company, Truck, TruckType } from '../types/index.ts';
import { ALGERIA_WILAYAS, getWilayaCoords } from '../lib/algeria-data.ts';
import { X, Truck as TruckIcon, Calendar, MapPin, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getTruckTypeLabel } from '../lib/status-helpers.tsx';

interface NewRequestModalProps {
  userCompanyId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  userCompanyId,
  onClose,
  onSuccess,
}) => {
  const [carriers, setCarriers] = useState<Company[]>([]);
  const [clientCompanies, setClientCompanies] = useState<Company[]>([]);
  const [availableTrucks, setAvailableTrucks] = useState<Truck[]>([]);

  // Form fields
  const [selectedClientId, setSelectedClientId] = useState<number>(userCompanyId || 1);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>('');
  const [goodsType, setGoodsType] = useState<string>('Produits manufacturés & palettes');
  const [quantity, setQuantity] = useState<string>('24');
  const [unit, setUnit] = useState<string>('palettes');
  const [totalWeightTons, setTotalWeightTons] = useState<string>('18.0');
  const [totalVolumeM3, setTotalVolumeM3] = useState<string>('45.0');
  const [requiredTruckType, setRequiredTruckType] = useState<TruckType>('FOURGON');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  // Dates (Default: tomorrow 08:00 to tomorrow 16:00)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const defaultPickup = `${tomorrow.toISOString().split('T')[0]}T08:00`;
  const defaultDelivery = `${tomorrow.toISOString().split('T')[0]}T16:00`;

  const [pickupDateTime, setPickupDateTime] = useState<string>(defaultPickup);
  const [deliveryDateTime, setDeliveryDateTime] = useState<string>(defaultDelivery);

  // Locations
  const [pickupWilaya, setPickupWilaya] = useState<string>('Alger');
  const [pickupAddress, setPickupAddress] = useState<string>('Zone Industrielle Rouïba, Voie 04');
  const [pickupContactName, setPickupContactName] = useState<string>('Mourad Kaddour');
  const [pickupContactPhone, setPickupContactPhone] = useState<string>('+213 550 11 22 33');

  const [deliveryWilaya, setDeliveryWilaya] = useState<string>('Oran');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('Zone d’Activité Es Sénia, Hangar B');
  const [deliveryContactName, setDeliveryContactName] = useState<string>('Farid Belhadj');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState<string>('+213 551 77 88 99');

  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [checkingTrucks, setCheckingTrucks] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch carriers & clients
  useEffect(() => {
    fetch('/api/companies')
      .then((r) => r.json())
      .then((data: Company[]) => {
        const carrs = data.filter((c) => c.type === 'CARRIER');
        const clis = data.filter((c) => c.type === 'CLIENT');
        setCarriers(carrs);
        setClientCompanies(clis);
        if (carrs.length > 0 && !selectedCarrierId) {
          setSelectedCarrierId(String(carrs[0].id));
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch compatible trucks with dynamic conflict check for the requested period
  useEffect(() => {
    if (!pickupDateTime || !deliveryDateTime) return;
    setCheckingTrucks(true);

    const params = new URLSearchParams({
      pickupDate: new Date(pickupDateTime).toISOString(),
      deliveryDate: new Date(deliveryDateTime).toISOString(),
      truckType: requiredTruckType,
      minTonnage: totalWeightTons || '0',
    });

    if (selectedCarrierId) {
      params.append('carrierId', selectedCarrierId);
    }

    fetch(`/api/trucks?${params.toString()}`)
      .then((r) => r.json())
      .then((trucks: Truck[]) => {
        setAvailableTrucks(trucks);
      })
      .catch((err) => console.error(err))
      .finally(() => setCheckingTrucks(false));
  }, [selectedCarrierId, requiredTruckType, totalWeightTons, pickupDateTime, deliveryDateTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const pCoords = getWilayaCoords(pickupWilaya);
      const dCoords = getWilayaCoords(deliveryWilaya);

      const res = await fetch('/api/transport-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientCompanyId: selectedClientId,
          carrierCompanyId: selectedCarrierId ? parseInt(selectedCarrierId, 10) : null,
          goodsType,
          quantity,
          unit,
          totalWeightTons: parseFloat(totalWeightTons),
          totalVolumeM3: totalVolumeM3 ? parseFloat(totalVolumeM3) : null,
          requiredTruckType,
          specialInstructions,
          pickupAddress,
          pickupWilaya,
          pickupDateTime: new Date(pickupDateTime).toISOString(),
          pickupContactName,
          pickupContactPhone,
          pickupLat: pCoords.lat,
          pickupLng: pCoords.lng,
          deliveryAddress,
          deliveryWilaya,
          deliveryDateTime: new Date(deliveryDateTime).toISOString(),
          deliveryContactName,
          deliveryContactPhone,
          deliveryLat: dCoords.lat,
          deliveryLng: dCoords.lng,
          selectedTruckId: selectedTruckId || null,
          status: 'DEMANDE_SOUMISE',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la demande.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg text-slate-950 font-bold">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Nouvelle Demande d'Expédition & Réservation</h3>
              <p className="text-xs text-slate-300">Planification logistique conforme aux normes algériennes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Entreprises & Fournisseur */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Entreprise Expéditrice (Client)
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                {clientCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.wilaya})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transporteur sollicité
              </label>
              <select
                value={selectedCarrierId}
                onChange={(e) => setSelectedCarrierId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="">-- Appel d'offres ouvert à tous les transporteurs --</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.wilaya})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Marchandise et Véhicule requis */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Marchandise & Caractéristiques de la charge
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nature de la marchandise
                </label>
                <input
                  type="text"
                  required
                  value={goodsType}
                  onChange={(e) => setGoodsType(e.target.value)}
                  placeholder="Ex: Ciment en sacs, Huile raffinée, Pièces détachées..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type de camion nécessaire
                </label>
                <select
                  value={requiredTruckType}
                  onChange={(e) => setRequiredTruckType(e.target.value as TruckType)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="PLATEAU">Plateau Ouvert / Ridelles</option>
                  <option value="FOURGON">Fourgon Fermé / Tautliner</option>
                  <option value="FRIGORIFIQUE">Frigorifique Dirigé</option>
                  <option value="BENNE">Benne TP / Vrac</option>
                  <option value="CITERNE">Citerne Alimentaire / Liquide</option>
                  <option value="PORTE_CHAR">Porte-Char Lourd</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Poids total (Tonnes)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={totalWeightTons}
                  onChange={(e) => setTotalWeightTons(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantité & Unité
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-1/2 px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-1/2 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="palettes">Palettes</option>
                    <option value="tonnes">Tonnes</option>
                    <option value="colis">Colis</option>
                    <option value="fardeaux">Fardeaux</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Volume utile estimé (m³)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={totalVolumeM3}
                  onChange={(e) => setTotalVolumeM3(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instructions particulières pour le transport & quai
              </label>
              <input
                type="text"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Ex: Arrimage avec 8 sangles minimum, bâche obligatoire, EPI de sécurité..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* Section 3: Sites de chargement et livraison (Algérie) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chargement */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Site de Chargement (Départ)
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date et Heure souhaitées (24h)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={pickupDateTime}
                  onChange={(e) => setPickupDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Wilaya</label>
                <select
                  value={pickupWilaya}
                  onChange={(e) => setPickupWilaya(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  {ALGERIA_WILAYAS.map((w) => (
                    <option key={w.code} value={w.name}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse précise</label>
                <input
                  type="text"
                  required
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Quai</label>
                  <input
                    type="text"
                    required
                    value={pickupContactName}
                    onChange={(e) => setPickupContactName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tél. Quai</label>
                  <input
                    type="text"
                    required
                    value={pickupContactPhone}
                    onChange={(e) => setPickupContactPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Destination */}
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200/80 space-y-3">
              <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Site de Livraison (Destination)
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date et Heure souhaitées (24h)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={deliveryDateTime}
                  onChange={(e) => setDeliveryDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Wilaya</label>
                <select
                  value={deliveryWilaya}
                  onChange={(e) => setDeliveryWilaya(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  {ALGERIA_WILAYAS.map((w) => (
                    <option key={w.code} value={w.name}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse précise</label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Réception</label>
                  <input
                    type="text"
                    required
                    value={deliveryContactName}
                    onChange={(e) => setDeliveryContactName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tél. Réception</label>
                  <input
                    type="text"
                    required
                    value={deliveryContactPhone}
                    onChange={(e) => setDeliveryContactPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Camions compatibles & Disponibilité en temps réel */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Vérification des camions compatibles ({availableTrucks.length} trouvés)
              </h4>
              {checkingTrucks && (
                <span className="text-[11px] text-slate-500 animate-pulse">Vérification des conflits...</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1">
              {availableTrucks.map((t) => {
                const isSelected = selectedTruckId === String(t.id);
                const isConflicted = !t.isAvailableForPeriod;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (!isConflicted) setSelectedTruckId(isSelected ? '' : String(t.id));
                    }}
                    className={`p-3 rounded-xl border text-xs transition cursor-pointer flex flex-col justify-between ${
                      isConflicted
                        ? 'bg-rose-50/40 border-rose-200 opacity-70 cursor-not-allowed'
                        : isSelected
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400'
                        : 'bg-white border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{t.licensePlate}</span>
                        <p className="text-[11px] text-slate-600">{t.brandModel}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                        {t.maxTonnage}T / {t.usableVolume}m³
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Wilaya: <strong className="text-slate-800">{t.currentWilaya}</strong>
                      </span>
                      {isConflicted ? (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Conflit sur ce créneau
                        </span>
                      ) : isSelected ? (
                        <span className="text-amber-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sélectionné
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">Disponible</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {availableTrucks.length === 0 && (
                <div className="col-span-2 text-center py-4 text-xs text-slate-500 bg-slate-50 rounded-lg">
                  Aucun camion du type sélectionné n'est enregistré auprès de ce transporteur.
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              {loading ? 'Soumission...' : 'Soumettre la Demande de Transport'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
