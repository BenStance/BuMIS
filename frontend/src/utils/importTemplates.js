const text = (value) => String(value ?? '').trim();
const optional = (value) => text(value) || undefined;
const number = (value, label) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative number`);
  return parsed;
};

export const categoryImport = {
  columns: [
    { key: 'name', header: 'Category Name', required: true, width: 28, example: 'Office Supplies', note: 'Required. A clear category name, up to 150 characters.' },
    { key: 'code', header: 'Category Code', width: 20, example: 'OFFICE', note: 'Optional internal code, up to 50 characters.' },
    { key: 'description', header: 'Description', width: 52, example: 'Stationery and office consumables', note: 'Optional user-friendly description, up to 255 characters.' },
  ],
  mapRow: (row) => ({ name: text(row.name), code: optional(row.code), description: optional(row.description) }),
};

const contactColumns = (nameHeader, nameExample) => [
  { key: 'name', header: nameHeader, required: true, width: 28, example: nameExample, note: 'Required. Legal or commonly used display name.' },
  { key: 'contactPerson', header: 'Contact Person', width: 26, example: 'Amina Hassan', note: 'Optional primary contact person.' },
  { key: 'email', header: 'Email', width: 30, example: 'contact@example.com', note: 'Optional valid email address.' },
  { key: 'phone', header: 'Phone', width: 20, example: '+255 700 000 000', note: 'Optional phone number. Set the Excel cell format to Text to preserve leading zeros.' },
  { key: 'address', header: 'Address', width: 38, example: 'Dar es Salaam, Tanzania', note: 'Optional physical or postal address.' },
  { key: 'tin', header: 'TIN', width: 20, example: '123-456-789', note: 'Optional taxpayer identification number.' },
  { key: 'notes', header: 'Notes', width: 48, example: 'Preferred contact time: mornings', note: 'Optional internal notes, up to 255 characters.' },
];

const contactMap = (row, nameKey) => ({
  [nameKey]: text(row.name),
  contactPerson: optional(row.contactPerson),
  email: optional(row.email),
  phone: optional(row.phone),
  address: optional(row.address),
  tin: optional(row.tin),
  notes: optional(row.notes),
});

export const customerImport = {
  columns: contactColumns('Customer Name', 'Kijani Retail Ltd'),
  mapRow: (row) => contactMap(row, 'fullName'),
};

export const vendorImport = {
  columns: contactColumns('Vendor Name', 'Mwangaza Distributors Ltd'),
  mapRow: (row) => contactMap(row, 'name'),
};

export const productImport = {
  columns: [
    { key: 'productName', header: 'Product Name', required: true, width: 28, example: 'A4 Copy Paper', note: 'Required product display name.' },
    { key: 'sku', header: 'SKU', required: true, width: 20, example: 'PAPER-A4-80', note: 'Required unique stock-keeping unit for this organization.' },
    { key: 'category', header: 'Category Name or Code', width: 26, example: 'OFFICE', note: 'Optional. Must match an existing category name or code.' },
    { key: 'barcode', header: 'Barcode', width: 22, example: '1234567890123', note: 'Optional. Format the Excel cell as Text for long barcodes.' },
    { key: 'unit', header: 'Unit', width: 16, example: 'Ream', note: 'Optional unit of measure, such as Piece, Box, Kg, or Ream.' },
    { key: 'description', header: 'Description', width: 42, example: '80gsm white copy paper, 500 sheets', note: 'Optional catalog description.' },
    { key: 'buyingPrice', header: 'Buying Price', required: true, type: 'number', width: 18, example: 12000, note: 'Required non-negative purchase price.' },
    { key: 'sellingPrice', header: 'Selling Price', required: true, type: 'number', width: 18, example: 15000, note: 'Required selling price greater than zero.' },
    { key: 'initialStockQuantity', header: 'Initial Stock', required: true, type: 'number', width: 18, example: 25, note: 'Required opening quantity; use zero when no opening stock exists.' },
    { key: 'minimumStock', header: 'Minimum Stock', required: true, type: 'number', width: 18, example: 5, note: 'Required reorder threshold; use zero if not needed.' },
    { key: 'imageUrl', header: 'Image URL', width: 38, example: 'https://example.com/product.jpg', note: 'Optional publicly accessible product image URL.' },
  ],
  mapRow: (row, categories) => {
    const categoryValue = text(row.category).toLowerCase();
    const category = categoryValue
      ? categories.find((item) => String(item.name || '').trim().toLowerCase() === categoryValue || String(item.code || '').trim().toLowerCase() === categoryValue)
      : null;
    if (categoryValue && !category) throw new Error(`Category "${row.category}" does not exist`);
    const sellingPrice = number(row.sellingPrice, 'Selling Price');
    if (sellingPrice <= 0) throw new Error('Selling Price must be greater than zero');
    return {
      productName: text(row.productName),
      sku: text(row.sku),
      categoryId: category?.id,
      barcode: optional(row.barcode),
      unit: optional(row.unit),
      description: optional(row.description),
      buyingPrice: number(row.buyingPrice, 'Buying Price'),
      sellingPrice,
      initialStockQuantity: number(row.initialStockQuantity, 'Initial Stock'),
      minimumStock: number(row.minimumStock, 'Minimum Stock'),
      imageUrl: optional(row.imageUrl),
    };
  },
};
