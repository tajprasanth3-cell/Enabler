import React, { useState } from 'react';
import { useApp } from '../../context/useApp';
import { motion } from 'framer-motion';
import {
  FiUploadCloud,
  FiAlertCircle,
  FiCheckCircle,
  FiLayers,
  FiFilter,
  FiSend,
} from 'react-icons/fi';
import type { Lead } from '../../types';
import StatusBadge from '../../components/common/Badge';

type CsvField = 'candidateName' | 'phone' | 'email' | 'city' | 'education' | 'candidateId';

const CSV_HEADER_ALIASES: Record<string, CsvField> = {
  candidatename: 'candidateName',
  name: 'candidateName',
  phone: 'phone',
  mobile: 'phone',
  email: 'email',
  city: 'city',
  education: 'education',
  candidateid: 'candidateId',
};

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && !field.trim()) {
      field = '';
      inQuotes = true;
    } else if (char === ',') {
      row.push(field.trim());
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index++;
      row.push(field.trim());
      if (row.some((value) => value)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some((value) => value)) rows.push(row);
  return rows;
}

export const LeadIngestion: React.FC = () => {
  const { leads, teams, ingestLeads, allocateStage1AdminToTeams, notify } = useApp();

  // Ingestion Modal / Form State
  const [candidateName, setCandidateName] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateCity, setCandidateCity] = useState('');
  const [candidateEducation, setCandidateEducation] = useState('');
  const [uploadResult, setUploadResult] = useState<{ added: number; duplicates: number } | null>(
    null
  );
  const [csvError, setCsvError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Stage 1 Allocation Modal State
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(teams.map((t) => t.id));
  const [leadsPerTeam, setLeadsPerTeam] = useState<number>(5);
  const [allocMethod, setAllocMethod] = useState<'EQUAL' | 'WORKLOAD_BASED'>('EQUAL');
  const [allocationError, setAllocationError] = useState<string | null>(null);

  // Filter state
  const [filterTeam, setFilterTeam] = useState<string>('ALL');

  const unassignedCount = leads.filter((l) => !l.currentTeamId).length;
  const maxPerTeam = selectedTeams.length ? Math.floor(unassignedCount / selectedTeams.length) : 0;
  const effectiveLeadsPerTeam = Math.min(Math.max(0, leadsPerTeam), maxPerTeam);
  const plannedAllocation = Math.min(selectedTeams.length * effectiveLeadsPerTeam, unassignedCount);

  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setCsvError(null);
    try {
      const rows = parseCsvRows(await file.text());
      if (rows.length < 2) {
        setCsvError('The file has no data rows. Expected a header row followed by candidate rows.');
        return;
      }

      const fields = rows[0].map((header) =>
        CSV_HEADER_ALIASES[header.trim().toLowerCase().replace(/[^a-z0-9]/g, '')]
      );
      if (!fields.includes('candidateName') || !fields.includes('phone')) {
        setCsvError("CSV must include 'candidateName' (or 'name') and 'phone' columns.");
        return;
      }

      const candidates: Array<Partial<Lead>> = [];
      const errors: string[] = [];
      rows.slice(1).forEach((row, index) => {
        const values: Partial<Record<CsvField, string>> = {};
        fields.forEach((field, columnIndex) => {
          if (field) values[field] = row[columnIndex] ?? '';
        });
        const candidateName = values.candidateName?.trim();
        const phone = values.phone?.trim();
        if (!candidateName || !phone) {
          errors.push(`Row ${index + 2}: missing ${!candidateName ? 'candidateName' : 'phone'}`);
          return;
        }
        candidates.push({
          candidateName,
          phone,
          email: values.email?.trim() || '',
          city: values.city?.trim() || '',
          education: values.education?.trim() || '',
          candidateId: values.candidateId?.trim() || undefined,
        });
      });

      if (!candidates.length) {
        setCsvError(errors.length ? errors.slice(0, 5).join('; ') : 'No valid candidate rows found.');
        return;
      }

      setUploadResult(ingestLeads(candidates));
      setFileName(file.name);
      setCsvError(
        errors.length
          ? `${errors.slice(0, 5).join('; ')}${errors.length > 5 ? ` (+${errors.length - 5} more)` : ''}`
          : null
      );
    } catch {
      setCsvError(`Could not read "${file.name}". Please try another CSV file.`);
    }
  };

  const handleLoadSampleBatch = () => {
    const sampleBatch = [
      { candidateName: 'Vikas Dubey', phone: '+91 98888 11111', email: 'vikas.d@gmail.com', city: 'Noida', education: 'B.Tech' },
      { candidateName: 'Megha Sharma', phone: '+91 98777 22222', email: 'megha.s@outlook.com', city: 'Delhi', education: 'BBA' },
      { candidateName: 'Kunal Singhania', phone: '+91 98666 33333', email: 'kunal.s@yahoo.com', city: 'Mumbai', education: 'B.Com' },
      { candidateName: 'Priya Patel (Existing Duplicate)', phone: '+91 98765 43210', email: 'rahul.v@gmail.com', city: 'Pune', education: 'MBA' },
      { candidateName: 'Aman Deep', phone: '+91 98555 44444', email: 'aman.d@gmail.com', city: 'Chandigarh', education: 'B.Sc' },
      { candidateName: 'Ritu Sen', phone: '+91 98444 55555', email: 'ritu.s@gmail.com', city: 'Kolkata', education: 'MCA' },
    ];

    const res = ingestLeads(sampleBatch);
    setUploadResult(res);
    setCsvError(null);
    setFileName('sample batch');
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !candidatePhone.trim()) {
      notify('error', 'Candidate name and phone are required.');
      return;
    }

    const res = ingestLeads([
      {
        candidateName,
        phone: candidatePhone,
        email: candidateEmail,
        city: candidateCity,
        education: candidateEducation,
      },
    ]);
    setUploadResult(res);
    setCandidateName('');
    setCandidatePhone('');
    setCandidateEmail('');
    setCandidateCity('');
    setCandidateEducation('');
  };

  const handleExecuteStage1Allocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeams.length || effectiveLeadsPerTeam <= 0) {
      setAllocationError('Select at least one team and a per-team count above zero.');
      return;
    }
    const allocated = allocateStage1AdminToTeams(selectedTeams, effectiveLeadsPerTeam, allocMethod);
    if (allocated <= 0) {
      setAllocationError('Allocation failed. Check the admin pool and your selection, then try again.');
      return;
    }
    setAllocationError(null);
    notify('success', `Allocated ${allocated} lead${allocated === 1 ? '' : 's'} across ${selectedTeams.length} team${selectedTeams.length === 1 ? '' : 's'}.`);
    setShowAllocModal(false);
  };

  const filteredLeads = leads.filter((l) => {
    if (filterTeam === 'ALL') return true;
    if (filterTeam === 'UNASSIGNED') return !l.currentTeamId;
    return l.currentTeamId === filterTeam;
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-5 border-b border-[#E2E8F0] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#059669]">
            <FiUploadCloud className="text-sm" />
            <span>Lead Ingestion & Stage 1 Allocation</span>
          </div>
          <h1 className="break-words text-2xl font-black leading-tight tracking-tight text-[#0F172A] sm:text-3xl">
            Data Ingestion & Team Distribution
          </h1>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#64748B] sm:text-sm">
            Import candidate records from CSV, deduplicate against the pool and within the batch, and distribute to team pools.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setAllocationError(null);
              setShowAllocModal(true);
            }}
            disabled={unassignedCount === 0}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${
              unassignedCount > 0
                ? 'shimmer-button text-white'
                : 'bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0] cursor-not-allowed'
            }`}
          >
            <FiSend />
            <span>Allocate to Teams ({unassignedCount} Available)</span>
          </button>
        </div>
      </div>

      {/* Upload & Duplicate Validation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CSV Ingestion */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <span>Bulk Data Upload (CSV)</span>
                </h3>
                <span className="text-[10px] text-[#64748B]">Batch ingestion pipeline</span>
              </div>
              <span className="text-xs text-[#059669] font-semibold bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
                Dedupe: Pool + Batch + Candidate ID
              </span>
            </div>

          <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#10B981] rounded-2xl p-4 sm:p-5 text-center transition-all bg-[#F8FAFC]">
            <FiUploadCloud className="mx-auto text-4xl text-[#059669] mb-2" />
            <h4 className="text-sm font-bold text-[#0F172A]">Import Candidate Master File</h4>
            <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1 mb-1 font-medium">
              Choose a .csv or .txt file with a header row. Columns: candidateName (or name), phone, email, city, education, candidateId.
            </p>
            <p className="text-[10px] text-[#94A3B8] font-mono mb-4">
              candidateName,phone,email,city,education,candidateId
            </p>
            <input
              id="lead-csv-file"
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={handleCsvFileChange}
              className="hidden"
            />
            <label
              htmlFor="lead-csv-file"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl shimmer-button text-white font-bold text-xs cursor-pointer shadow-md transition-all"
            >
              <FiUploadCloud />
              Choose CSV File
            </label>
            {fileName && (
              <p className="text-[11px] text-[#64748B] font-semibold mt-2 truncate">Loaded: {fileName}</p>
            )}
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={handleLoadSampleBatch}
                className="px-5 py-2.5 rounded-xl bg-white text-[#059669] border border-[#A7F3D0] hover:bg-[#ECFDF5] font-bold text-xs cursor-pointer shadow-xs transition-all"
              >
                Load sample batch (6 records)
              </button>
            </div>
          </div>

          {csvError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border bg-[#FEF2F2] border-[#FECACA] text-[#DC2626] text-xs font-medium flex items-start gap-2"
            >
              <FiAlertCircle className="text-base shrink-0" />
              <span className="flex-1">{csvError}</span>
              <button
                onClick={() => setCsvError(null)}
                className="font-bold cursor-pointer"
                aria-label="Dismiss CSV errors"
              >
                ✕
              </button>
            </motion.div>
          )}

          {/* Upload Status Banner */}
          {uploadResult && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
                uploadResult.duplicates > 0
                  ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]'
                  : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              }`}
            >
              <div className="flex items-center gap-2">
                {uploadResult.duplicates > 0 ? (
                  <FiAlertCircle className="text-base text-[#D97706]" />
                ) : (
                  <FiCheckCircle className="text-base text-[#059669]" />
                )}
                <span>
                  Successfully ingested <strong>{uploadResult.added}</strong> valid leads.
                  {uploadResult.duplicates > 0 && (
                    <span> Flagged and rejected <strong>{uploadResult.duplicates} duplicate</strong> records.</span>
                  )}
                </span>
              </div>
              <button
                onClick={() => setUploadResult(null)}
                className="text-[#64748B] hover:text-[#0F172A] font-bold"
              >
                ✕
              </button>
            </motion.div>
          )}
          </div>
        </div>

        {/* Quick Add Single Candidate */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                <span>Quick Add Candidate</span>
              </h3>
              <span className="text-[10px] text-[#64748B]">Single record entry</span>
            </div>
            <form onSubmit={handleManualAdd} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#64748B] mb-1 font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Alok Verma"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[#64748B] mb-1 font-semibold">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  placeholder="e.g. +91 99888 77665"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[#64748B] mb-1 font-semibold">Email</label>
                <input
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="candidate@email.com"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-medium focus:outline-none focus:border-[#10B981] focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] font-bold border border-[#A7F3D0] transition-all cursor-pointer shadow-xs"
              >
                Add Candidate
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Master Leads Ledger */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiLayers className="text-[#059669]" />
            <h3 className="text-base font-bold text-[#0F172A]">Candidate Lead Repository</h3>
            <span className="text-xs text-[#64748B] font-semibold">({leads.length} Total Records)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <FiFilter className="shrink-0 text-[#64748B]" />
            <span className="shrink-0 font-semibold text-[#64748B]">Filter Team:</span>
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="min-w-0 max-w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 font-medium text-[#0F172A] focus:border-[#10B981] focus:outline-none w-full sm:w-auto sm:max-w-[240px]"
            >
              <option value="ALL">All Leads</option>
              <option value="UNASSIGNED">Unassigned Pool ({unassignedCount})</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <th className="px-4 py-3.5 sm:px-5">Lead ID</th>
                <th className="px-4 py-3.5 sm:px-5">Candidate Name</th>
                <th className="px-4 py-3.5 sm:px-5">Contact</th>
                <th className="px-4 py-3.5 sm:px-5">City / Degree</th>
                <th className="min-w-[160px] px-4 py-3.5 sm:px-5">Assigned Team</th>
                <th className="px-4 py-3.5 sm:px-5">Assigned BDE</th>
                <th className="px-4 py-3.5 sm:px-5">Lifecycle Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3.5 sm:px-5 font-mono text-[#64748B]">{lead.id}</td>
                  <td className="px-4 py-3.5 sm:px-5 font-bold text-[#0F172A]">{lead.candidateName}</td>
                  <td className="px-4 py-3.5 sm:px-5 text-[#475569]">
                    <div className="font-semibold text-[#0F172A]">{lead.phone}</div>
                    <div className="text-[10px] text-[#64748B]">{lead.email || '—'}</div>
                  </td>
                  <td className="px-4 py-3.5 sm:px-5 text-[#475569]">
                    <div>{lead.city}</div>
                    <div className="text-[10px] text-[#64748B]">{lead.education}</div>
                  </td>
                  <td className="min-w-[160px] px-4 py-3.5 font-bold sm:px-5">
                    {lead.currentTeamName ? (
                      <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1 text-[11px] font-bold text-[#059669]">
                        {lead.currentTeamName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1 text-[11px] font-bold text-[#D97706]">
                        Unassigned Pool
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 sm:px-5 text-[#475569]">
                    {lead.currentBdeName ? (
                      <span className="font-medium text-[#0F172A]">{lead.currentBdeName}</span>
                    ) : (
                      <span className="text-[#64748B] italic">In Team Pool</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 sm:px-5">
                    <StatusBadge status={lead.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stage 1 Lead Allocation Modal */}
      {showAllocModal && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel w-full max-w-lg space-y-5 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FiSend className="text-[#059669]" />
                <span>Stage 1: Allocate Leads to Teams</span>
              </h3>
              <button
                onClick={() => setShowAllocModal(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-[#64748B] cursor-pointer hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteStage1Allocation} className="space-y-4 text-xs">
              <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-4 font-semibold text-[#065F46]">
                Total Unassigned Leads in Admin Pool: <strong>{unassignedCount}</strong>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-2">Select Target Teams</label>
                <div className="space-y-2">
                  {teams.map((t) => (
                    <label
                      key={t.id}
                      className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 cursor-pointer transition-colors hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeams.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeams((prev) => [...prev, t.id]);
                          } else {
                            setSelectedTeams((prev) => prev.filter((id) => id !== t.id));
                          }
                        }}
                        className="accent-[#10B981]"
                      />
                      <span className="whitespace-nowrap font-bold text-[#0F172A]">{t.name}</span>
                      <span className="text-[11px] text-[#64748B]">(TL: {t.teamLeadName})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">
                    Leads per Team
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={maxPerTeam}
                    value={effectiveLeadsPerTeam}
                    onChange={(e) => setLeadsPerTeam(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">
                    Allocation Strategy
                  </label>
                  <select
                    value={allocMethod}
                    onChange={(e) => setAllocMethod(e.target.value as any)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981] focus:bg-white"
                  >
                    <option value="EQUAL">Equal Distribution</option>
                    <option value="WORKLOAD_BASED">Workload-Balanced</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-[11px] text-[#64748B]">
                Total allocation: <strong className="text-[#0F172A]">{plannedAllocation}</strong> of{' '}
                {unassignedCount} pooled leads will be distributed into {selectedTeams.length} team
                pool{selectedTeams.length === 1 ? '' : 's'}.
              </div>

              {maxPerTeam === 0 && (
                <p className="text-[11px] font-semibold text-[#D97706]">
                  Add more leads to the admin pool before allocating to the selected teams.
                </p>
              )}

              {allocationError && (
                <div className="flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-[11px] font-semibold text-[#DC2626]">
                  <FiAlertCircle className="text-sm shrink-0" />
                  <span>{allocationError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">
                <button
                  type="button"
                  onClick={() => setShowAllocModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl shimmer-button text-white text-xs font-bold cursor-pointer shadow-md"
                >
                  Distribute to Teams
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LeadIngestion;
