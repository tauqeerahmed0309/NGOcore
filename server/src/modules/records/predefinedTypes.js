/**
 * Default Non-Profit & Humanitarian Predefined Record Types
 * Automatically provisioned for verified NGO tenants.
 */
const PREDEFINED_RECORD_TYPES = [
  {
    name: 'Beneficiary',
    slug: 'beneficiary',
    prefix: 'BEN',
    icon: 'Users',
    description: 'Core recipient and beneficiary demographic records with encrypted PII.',
    isPredefined: true,
    fields: [
      {
        name: 'Full Name',
        key: 'full_name',
        type: 'Text',
        required: true,
        placeholder: 'e.g. Maria Gonzalez'
      },
      {
        name: 'Gender',
        key: 'gender',
        type: 'Dropdown',
        required: true,
        options: ['Female', 'Male', 'Non-Binary', 'Other', 'Prefer not to say']
      },
      {
        name: 'Date of Birth',
        key: 'date_of_birth',
        type: 'Date',
        required: false
      },
      {
        name: 'National ID / Aadhaar',
        key: 'national_id',
        type: 'Encrypted Text',
        required: true,
        isSensitive: true,
        placeholder: 'National identification number (Encrypted with AES-256)'
      },
      {
        name: 'Phone Number',
        key: 'phone',
        type: 'Phone',
        required: false,
        isSensitive: true,
        placeholder: '+1 (555) 000-0000'
      },
      {
        name: 'Primary Address',
        key: 'address',
        type: 'Long Text',
        required: false,
        placeholder: 'Village, district, or settlement'
      },
      {
        name: 'Assistance Category',
        key: 'assistance_category',
        type: 'Dropdown',
        required: true,
        options: ['Food Security', 'Healthcare & Medical', 'Shelter & Housing', 'Emergency Cash', 'Education Support']
      },
      {
        name: 'Vulnerability Index',
        key: 'vulnerability_index',
        type: 'Dropdown',
        required: false,
        options: ['High Priority', 'Moderate Need', 'Standard']
      }
    ]
  },
  {
    name: 'Aid Distribution',
    slug: 'aid-distribution',
    prefix: 'AID',
    icon: 'HeartHandshake',
    description: 'Log of humanitarian relief, medical supplies, food packages, or emergency grants disbursed.',
    isPredefined: true,
    fields: [
      {
        name: 'Beneficiary Reference',
        key: 'beneficiary_ref',
        type: 'Text',
        required: true,
        placeholder: 'Beneficiary name or Record ID'
      },
      {
        name: 'Campaign / Project',
        key: 'campaign',
        type: 'Text',
        required: true,
        placeholder: 'e.g. Winter Relief 2026'
      },
      {
        name: 'Aid Type',
        key: 'aid_type',
        type: 'Dropdown',
        required: true,
        options: ['Food Ration Kit', 'Medical Supplies', 'Cash Assistance', 'Warm Blankets & Clothes', 'Clean Water Filtration Kit']
      },
      {
        name: 'Disbursed Quantity / Amount',
        key: 'quantity',
        type: 'Number',
        required: true,
        placeholder: 'e.g. 5'
      },
      {
        name: 'Unit of Measure',
        key: 'unit',
        type: 'Dropdown',
        required: true,
        options: ['Kits', 'Units', 'INR', 'USD', 'Kilograms']
      },
      {
        name: 'Distribution Date',
        key: 'distribution_date',
        type: 'Date',
        required: true
      },
      {
        name: 'Field Officer Name',
        key: 'officer_name',
        type: 'Text',
        required: false,
        placeholder: 'Staff member verifying handover'
      }
    ]
  },
  {
    name: 'Donation & Grant',
    slug: 'donation-grant',
    prefix: 'DON',
    icon: 'Receipt',
    description: 'Funding sources, institutional grants, and philanthropic donor receipts.',
    isPredefined: true,
    fields: [
      {
        name: 'Donor / Grantor Name',
        key: 'donor_name',
        type: 'Text',
        required: true,
        placeholder: 'Foundation, corporation, or individual'
      },
      {
        name: 'Donor Classification',
        key: 'donor_type',
        type: 'Dropdown',
        required: true,
        options: ['Individual Donor', 'Corporate CSR Grant', 'Multilateral / UN Agency', 'Philanthropic Foundation', 'Government Aid']
      },
      {
        name: 'Funding Amount',
        key: 'amount',
        type: 'Currency',
        required: true,
        placeholder: '10000'
      },
      {
        name: 'Designated Project',
        key: 'project_tag',
        type: 'Text',
        required: false,
        placeholder: 'e.g. Rural Health Initiative'
      },
      {
        name: 'Tax Exemption Issued',
        key: 'tax_exemption_issued',
        type: 'Checkbox',
        required: false
      },
      {
        name: '80G / 501(c)(3) Receipt ID',
        key: 'receipt_id',
        type: 'Text',
        required: false,
        placeholder: 'Receipt certificate reference'
      }
    ]
  },
  {
    name: 'Volunteer & Staff',
    slug: 'volunteer-staff',
    prefix: 'VOL',
    icon: 'Briefcase',
    description: 'Field workers, volunteers, medical practitioners, and disaster response staff.',
    isPredefined: true,
    fields: [
      {
        name: 'Full Name',
        key: 'full_name',
        type: 'Text',
        required: true,
        placeholder: 'e.g. Ahmed Khan'
      },
      {
        name: 'Deployment Role',
        key: 'role',
        type: 'Dropdown',
        required: true,
        options: ['Field Caseworker', 'Emergency Medic', 'Logistics Coordinator', 'Counselor / Social Worker', 'Community Volunteer']
      },
      {
        name: 'Primary Contact Phone',
        key: 'phone',
        type: 'Phone',
        required: true,
        placeholder: '+1 555-0199'
      },
      {
        name: 'Emergency Contact Details',
        key: 'emergency_contact',
        type: 'Encrypted Text',
        required: false,
        isSensitive: true,
        placeholder: 'Next of kin & contact (Encrypted)'
      },
      {
        name: 'Assigned Field Zone',
        key: 'assigned_zone',
        type: 'Text',
        required: false,
        placeholder: 'District or field base'
      }
    ]
  }
];

module.exports = { PREDEFINED_RECORD_TYPES };
