import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Save,
  Building2,
  Mail,
  FileText,
  DollarSign,
  Percent,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { settingsApi } from '../../api/index.js';
import PageContainer from '../../layouts/PageContainer.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';

// ---------- Helper Components ----------
function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all
        ${
          active
            ? 'bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20'
            : 'text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'
        }
      `}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function FormField({ label, name, value, onChange, type = 'text', placeholder, required = false, disabled = false }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-[var(--color-text-secondary)]">
        {label} {required && '*'}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none disabled:opacity-60 resize-none"
        />
      ) : type === 'checkbox' ? (
        <div className="mt-1 flex items-center gap-2">
          <input
            type="checkbox"
            id={name}
            name={name}
            checked={!!value}
            onChange={(e) => onChange({ target: { name, value: e.target.checked } })}
            disabled={disabled}
            className="h-4 w-4 rounded border-[var(--color-panel-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
          />
          <label htmlFor={name} className="text-sm text-[var(--color-text-secondary)]">
            Enabled
          </label>
        </div>
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none disabled:opacity-60"
        />
      )}
    </div>
  );
}

// ---------- Main Component ----------
export function SystemSettingsPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Settings data
  const [businessSettings, setBusinessSettings] = useState({
    businessName: '',
    logo: '',
    address: '',
    phone: '',
    email: '',
    tin: '',
    description: '',
    website: '',
  });
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: 587,
    fromEmail: '',
    fromName: '',
    username: '',
    password: '',
    encryption: 'tls',
  });
  const [invoiceSettings, setInvoiceSettings] = useState({
    prefix: 'INV-',
    includeYear: true,
    padding: 6,
    walkInCustomerName: 'Walk-in Customer',
    printLayout: 'standard',
    footerNotes: '',
    paymentInstructions: '',
    signatureArea: true,
  });
  const [currencySettings, setCurrencySettings] = useState({
    name: 'Tanzanian Shilling',
    symbol: 'TZS',
    decimalPrecision: 0,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  });
  const [taxSettings, setTaxSettings] = useState({
    enabled: false,
    rate: 18,
    name: 'VAT',
    display: 'inclusive',
  });

  // Tab state
  const [activeTab, setActiveTab] = useState('business');

  // ---------- Data fetching ----------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsApi.all();

      // Populate business
      const biz = data.business || {};
      setBusinessSettings({
        businessName: biz.businessName || '',
        logo: biz.logo || '',
        address: biz.address || '',
        phone: biz.phone || '',
        email: biz.email || '',
        tin: biz.tin || '',
        description: data.settings?.business?.['business.description'] || '',
        website: data.settings?.business?.['business.website'] || '',
      });

      // SMTP
      const smtp = data.settings?.smtp || {};
      setSmtpSettings({
        host: smtp['smtp.host'] || '',
        port: smtp['smtp.port'] || 587,
        fromEmail: smtp['smtp.from_email'] || '',
        fromName: smtp['smtp.from_name'] || '',
        username: smtp['smtp.username'] || '',
        password: smtp['smtp.password'] || '',
        encryption: smtp['smtp.encryption'] || 'tls',
      });

      // Invoice
      const invoice = data.settings?.invoice || {};
      setInvoiceSettings({
        prefix: invoice['invoice.number_prefix'] || 'INV-',
        includeYear: invoice['invoice.number_include_year'] ?? true,
        padding: invoice['invoice.number_padding'] || 6,
        walkInCustomerName: invoice['invoice.walk_in_customer_name'] || 'Walk-in Customer',
        printLayout: invoice['invoice.print_layout'] || 'standard',
        footerNotes: invoice['invoice.footer_notes'] || '',
        paymentInstructions: invoice['invoice.payment_instructions'] || '',
        signatureArea: invoice['invoice.signature_area'] ?? true,
      });

      // Currency
      const currency = data.settings?.currency || {};
      setCurrencySettings({
        name: currency['currency.name'] || 'Tanzanian Shilling',
        symbol: currency['currency.symbol'] || 'TZS',
        decimalPrecision: currency['currency.decimal_precision'] ?? 0,
        thousandsSeparator: currency['currency.thousands_separator'] || ',',
        decimalSeparator: currency['currency.decimal_separator'] || '.',
      });

      // Tax
      const tax = data.settings?.tax || {};
      setTaxSettings({
        enabled: tax['tax.enabled'] ?? false,
        rate: tax['tax.rate'] || 18,
        name: tax['tax.name'] || 'VAT',
        display: tax['tax.display'] || 'inclusive',
      });
    } catch (err) {
      setError(err?.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = async () => {
    setRefreshing(true);
    setSuccessMessage('');
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------- Form change handlers ----------
  const handleBusinessChange = (e) => {
    const { name, value } = e.target;
    setBusinessSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSmtpChange = (e) => {
    const { name, value } = e.target;
    setSmtpSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleInvoiceChange = (e) => {
    const { name, value, type } = e.target;
    setInvoiceSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? value : value,
    }));
  };

  const handleCurrencyChange = (e) => {
    const { name, value } = e.target;
    setCurrencySettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleTaxChange = (e) => {
    const { name, value, type } = e.target;
    setTaxSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? value : value,
    }));
  };

  // ---------- Save handlers ----------
  const saveBusiness = async (e) => {
    e.preventDefault();
    try {
      await settingsApi.updateBusiness({
        businessName: businessSettings.businessName,
        logo: businessSettings.logo,
        address: businessSettings.address,
        phone: businessSettings.phone,
        email: businessSettings.email,
        tin: businessSettings.tin,
        description: businessSettings.description,
        website: businessSettings.website,
      });
      setSuccessMessage('Business settings saved successfully!');
      await fetchData();
    } catch (err) {
      alert('Failed to save business settings: ' + err.message);
    }
  };

  const saveSmtp = async (e) => {
    e.preventDefault();
    try {
      await settingsApi.updateSmtp({
        host: smtpSettings.host,
        port: smtpSettings.port,
        fromEmail: smtpSettings.fromEmail,
        fromName: smtpSettings.fromName,
        username: smtpSettings.username,
        password: smtpSettings.password,
        encryption: smtpSettings.encryption,
      });
      setSuccessMessage('SMTP settings saved successfully!');
      await fetchData();
    } catch (err) {
      alert('Failed to save SMTP settings: ' + err.message);
    }
  };

  const saveInvoice = async (e) => {
    e.preventDefault();
    try {
      await settingsApi.updateInvoice({
        prefix: invoiceSettings.prefix,
        includeYear: invoiceSettings.includeYear,
        padding: invoiceSettings.padding,
        walkInCustomerName: invoiceSettings.walkInCustomerName,
        printLayout: invoiceSettings.printLayout,
        footerNotes: invoiceSettings.footerNotes,
        paymentInstructions: invoiceSettings.paymentInstructions,
        signatureArea: invoiceSettings.signatureArea,
      });
      setSuccessMessage('Invoice settings saved successfully!');
      await fetchData();
    } catch (err) {
      alert('Failed to save invoice settings: ' + err.message);
    }
  };

  const saveCurrency = async (e) => {
    e.preventDefault();
    try {
      await settingsApi.updateCurrency({
        name: currencySettings.name,
        symbol: currencySettings.symbol,
        decimalPrecision: currencySettings.decimalPrecision,
        thousandsSeparator: currencySettings.thousandsSeparator,
        decimalSeparator: currencySettings.decimalSeparator,
      });
      setSuccessMessage('Currency settings saved successfully!');
      await fetchData();
    } catch (err) {
      alert('Failed to save currency settings: ' + err.message);
    }
  };

  const saveTax = async (e) => {
    e.preventDefault();
    try {
      await settingsApi.updateTax({
        enabled: taxSettings.enabled,
        rate: taxSettings.rate,
        name: taxSettings.name,
        display: taxSettings.display,
      });
      setSuccessMessage('Tax settings saved successfully!');
      await fetchData();
    } catch (err) {
      alert('Failed to save tax settings: ' + err.message);
    }
  };

  // ---------- Render ----------
  const tabs = [
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'smtp', label: 'SMTP', icon: Mail },
    { id: 'invoice', label: 'Invoice', icon: FileText },
    { id: 'currency', label: 'Currency', icon: DollarSign },
    { id: 'tax', label: 'Tax', icon: Percent },
  ];

  return (
    <PageContainer
      title="System Settings"
      subtitle="Configure platform-wide settings, defaults, and operational preferences."
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      }
    >
      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3"
        >
          <CheckCircle className="h-5 w-5 text-emerald-500" />
          <p className="text-sm text-emerald-600 dark:text-emerald-300">{successMessage}</p>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-panel-border)] pb-4">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSuccessMessage('');
            }}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {loading && !refreshing ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
              <p className="text-sm text-[var(--color-text-secondary)]">Loading settings...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="mt-4 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Business Settings */}
            {activeTab === 'business' && (
              <motion.form
                key="business"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
                onSubmit={saveBusiness}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Business Name"
                    name="businessName"
                    value={businessSettings.businessName}
                    onChange={handleBusinessChange}
                    required
                  />
                  <FormField
                    label="Logo URL"
                    name="logo"
                    value={businessSettings.logo}
                    onChange={handleBusinessChange}
                    placeholder="https://example.com/logo.png"
                  />
                  <FormField
                    label="Address"
                    name="address"
                    value={businessSettings.address}
                    onChange={handleBusinessChange}
                  />
                  <FormField
                    label="Phone"
                    name="phone"
                    value={businessSettings.phone}
                    onChange={handleBusinessChange}
                  />
                  <FormField
                    label="Email"
                    name="email"
                    type="email"
                    value={businessSettings.email}
                    onChange={handleBusinessChange}
                  />
                  <FormField
                    label="TIN"
                    name="tin"
                    value={businessSettings.tin}
                    onChange={handleBusinessChange}
                  />
                  <FormField
                    label="Description"
                    name="description"
                    type="textarea"
                    value={businessSettings.description}
                    onChange={handleBusinessChange}
                  />
                  <FormField
                    label="Website"
                    name="website"
                    value={businessSettings.website}
                    onChange={handleBusinessChange}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    <Save className="h-4 w-4" />
                    Save Business Settings
                  </button>
                </div>
              </motion.form>
            )}

            {/* SMTP Settings */}
            {activeTab === 'smtp' && (
              <motion.form
                key="smtp"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
                onSubmit={saveSmtp}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="SMTP Host"
                    name="host"
                    value={smtpSettings.host}
                    onChange={handleSmtpChange}
                    required
                  />
                  <FormField
                    label="Port"
                    name="port"
                    type="number"
                    value={smtpSettings.port}
                    onChange={handleSmtpChange}
                    required
                  />
                  <FormField
                    label="From Email"
                    name="fromEmail"
                    type="email"
                    value={smtpSettings.fromEmail}
                    onChange={handleSmtpChange}
                    required
                  />
                  <FormField
                    label="From Name"
                    name="fromName"
                    value={smtpSettings.fromName}
                    onChange={handleSmtpChange}
                  />
                  <FormField
                    label="Username"
                    name="username"
                    value={smtpSettings.username}
                    onChange={handleSmtpChange}
                  />
                  <FormField
                    label="Password"
                    name="password"
                    type="password"
                    value={smtpSettings.password}
                    onChange={handleSmtpChange}
                  />
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                      Encryption
                    </label>
                    <select
                      name="encryption"
                      value={smtpSettings.encryption}
                      onChange={handleSmtpChange}
                      className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                    >
                      <option value="none">None</option>
                      <option value="tls">TLS</option>
                      <option value="ssl">SSL</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    <Save className="h-4 w-4" />
                    Save SMTP Settings
                  </button>
                </div>
              </motion.form>
            )}

            {/* Invoice Settings */}
            {activeTab === 'invoice' && (
              <motion.form
                key="invoice"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
                onSubmit={saveInvoice}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Invoice Prefix"
                    name="prefix"
                    value={invoiceSettings.prefix}
                    onChange={handleInvoiceChange}
                  />
                  <FormField
                    label="Number Padding"
                    name="padding"
                    type="number"
                    value={invoiceSettings.padding}
                    onChange={handleInvoiceChange}
                  />
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                      Include Year
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="includeYear"
                        checked={invoiceSettings.includeYear}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            includeYear: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-[var(--color-panel-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                      />
                      <span className="text-sm text-[var(--color-text-secondary)]">Enabled</span>
                    </div>
                  </div>
                  <FormField
                    label="Walk-in Customer Name"
                    name="walkInCustomerName"
                    value={invoiceSettings.walkInCustomerName}
                    onChange={handleInvoiceChange}
                  />
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                      Print Layout
                    </label>
                    <select
                      name="printLayout"
                      value={invoiceSettings.printLayout}
                      onChange={handleInvoiceChange}
                      className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                    >
                      <option value="standard">Standard</option>
                      <option value="compact">Compact</option>
                      <option value="detailed">Detailed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                      Signature Area
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="signatureArea"
                        checked={invoiceSettings.signatureArea}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            signatureArea: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-[var(--color-panel-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                      />
                      <span className="text-sm text-[var(--color-text-secondary)]">Enabled</span>
                    </div>
                  </div>
                  <FormField
                    label="Footer Notes"
                    name="footerNotes"
                    type="textarea"
                    value={invoiceSettings.footerNotes}
                    onChange={handleInvoiceChange}
                  />
                  <FormField
                    label="Payment Instructions"
                    name="paymentInstructions"
                    type="textarea"
                    value={invoiceSettings.paymentInstructions}
                    onChange={handleInvoiceChange}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    <Save className="h-4 w-4" />
                    Save Invoice Settings
                  </button>
                </div>
              </motion.form>
            )}

            {/* Currency Settings */}
            {activeTab === 'currency' && (
              <motion.form
                key="currency"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
                onSubmit={saveCurrency}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Currency Name"
                    name="name"
                    value={currencySettings.name}
                    onChange={handleCurrencyChange}
                    required
                  />
                  <FormField
                    label="Currency Symbol"
                    name="symbol"
                    value={currencySettings.symbol}
                    onChange={handleCurrencyChange}
                    required
                  />
                  <FormField
                    label="Decimal Precision"
                    name="decimalPrecision"
                    type="number"
                    value={currencySettings.decimalPrecision}
                    onChange={handleCurrencyChange}
                    min="0"
                    max="4"
                  />
                  <FormField
                    label="Thousands Separator"
                    name="thousandsSeparator"
                    value={currencySettings.thousandsSeparator}
                    onChange={handleCurrencyChange}
                    maxLength={1}
                  />
                  <FormField
                    label="Decimal Separator"
                    name="decimalSeparator"
                    value={currencySettings.decimalSeparator}
                    onChange={handleCurrencyChange}
                    maxLength={1}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    <Save className="h-4 w-4" />
                    Save Currency Settings
                  </button>
                </div>
              </motion.form>
            )}

            {/* Tax Settings */}
            {activeTab === 'tax' && (
              <motion.form
                key="tax"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
                onSubmit={saveTax}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                      Tax Enabled
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="enabled"
                        checked={taxSettings.enabled}
                        onChange={(e) =>
                          setTaxSettings({
                            ...taxSettings,
                            enabled: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-[var(--color-panel-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                      />
                      <span className="text-sm text-[var(--color-text-secondary)]">Enabled</span>
                    </div>
                  </div>
                  <FormField
                    label="Tax Rate (%)"
                    name="rate"
                    type="number"
                    value={taxSettings.rate}
                    onChange={handleTaxChange}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <FormField
                    label="Tax Name"
                    name="name"
                    value={taxSettings.name}
                    onChange={handleTaxChange}
                  />
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                      Display
                    </label>
                    <select
                      name="display"
                      value={taxSettings.display}
                      onChange={handleTaxChange}
                      className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                    >
                      <option value="inclusive">Inclusive</option>
                      <option value="exclusive">Exclusive</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    <Save className="h-4 w-4" />
                    Save Tax Settings
                  </button>
                </div>
              </motion.form>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}

export default SystemSettingsPage;