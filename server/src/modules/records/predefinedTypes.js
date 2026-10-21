/**
 * Default Non-Profit & Humanitarian Predefined Record Types (Localized for India)
 * Automatically provisioned for verified NGO tenants.
 */
const { INDIAN_STATES } = require('../../utils/format');

const PREDEFINED_RECORD_TYPES = [
  {
    name: 'Beneficiary',
    slug: 'beneficiary',
    prefix: 'BEN',
    icon: 'Users',
    description: 'Core recipient and beneficiary demographic records with DPDP-compliant masked Aadhaar and encrypted PII.',
    isPredefined: true,
    fields: [
      {
        name: 'Full Name',
        key: 'full_name',
        type: 'Text',
        required: true,
        placeholder: 'e.g. Sunita Devi'
      },
      {
        name: 'Gender',
        key: 'gender',
        type: 'Dropdown',
        required: true,
        options: ['Female', 'Male', 'Transgender / Other', 'Prefer not to say']
      },
      {
        name: 'Date of Birth',
        key: 'date_of_birth',
        type: 'Date',
        required: false
      },
      {
        name: 'Aadhaar (Last 4 Digits / Masked)',
        key: 'national_id',
        type: 'Encrypted Text',
        required: false,
        isSensitive: true,
        placeholder: 'XXXX XXXX 1234 (UIDAI compliant: only masked/last 4 digits stored)'
      },
      {
        name: 'Mobile Phone',
        key: 'phone',
        type: 'Phone',
        required: false,
        isSensitive: true,
        placeholder: '+91 98765 43210'
      },
      {
        name: 'Village / Ward',
        key: 'village_ward',
        type: 'Text',
        required: false,
        placeholder: 'Village name or Municipal Ward number'
      },
      {
        name: 'Block / Tehsil',
        key: 'block_tehsil',
        type: 'Text',
        required: false,
        placeholder: 'Block or Tehsil'
      },
      {
        name: 'District',
        key: 'district',
        type: 'Text',
        required: true,
        placeholder: 'e.g. Indore, Pune, Bengaluru Urban, Lucknow'
      },
      {
        name: 'State / UT',
        key: 'state',
        type: 'Dropdown',
        required: true,
        options: INDIAN_STATES
      },
      {
        name: 'PIN Code',
        key: 'pincode',
        type: 'Text',
        required: false,
        placeholder: '6-digit PIN code (e.g. 560001)'
      },
      {
        name: 'Assistance Scheme',
        key: 'assistance_category',
        type: 'Dropdown',
        required: true,
        options: [
          'Education Support',
          'Healthcare Camp',
          'Nutrition & Food Relief',
          'Skill Training',
          'Disaster Relief'
        ]
      },
      {
        name: 'Ration Card / BPL Status',
        key: 'ration_card_category',
        type: 'Dropdown',
        required: false,
        options: [
          'Antyodaya Anna Yojana (AAY)',
          'Below Poverty Line (BPL)',
          'Above Poverty Line (APL)',
          'No Ration Card'
        ]
      },
      {
        name: 'Caste Category (Govt Reporting)',
        key: 'caste_category',
        type: 'Dropdown',
        required: false,
        options: ['General', 'OBC', 'SC', 'ST', 'Prefer not to say'],
        placeholder: 'Optional sensitive demographic collected solely for statutory reporting with explicit consent'
      },
      {
        name: 'Vulnerability Priority',
        key: 'vulnerability_index',
        type: 'Dropdown',
        required: false,
        options: ['High Priority (Widow / Destitute / PwD)', 'Moderate Need', 'Standard']
      }
    ]
  },
  {
    name: 'Aid Distribution',
    slug: 'aid-distribution',
    prefix: 'AID',
    icon: 'HeartHandshake',
    description: 'Log of humanitarian relief kits, medical supplies, food packages, or direct cash assistance disbursed.',
    isPredefined: true,
    fields: [
      {
        name: 'Beneficiary Reference',
        key: 'beneficiary_ref',
        type: 'Text',
        required: true,
        placeholder: 'Beneficiary Name or BEN-2026-XXXXX'
      },
      {
        name: 'Campaign / Programme',
        key: 'campaign',
        type: 'Text',
        required: true,
        placeholder: 'e.g. Monsoon Disaster Relief 2026'
      },
      {
        name: 'Aid Type',
        key: 'aid_type',
        type: 'Dropdown',
        required: true,
        options: [
          'Food Ration Kit',
          'Emergency Healthcare Kit',
          'Nutrition Supplement Pack',
          'Educational Material Kit',
          'Warm Blankets & Clothing',
          'Clean Water Filter Kit',
          'Direct Cash Assistance'
        ]
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
        options: ['Kits', 'Units', 'INR (₹)', 'Kilograms', 'Packets', 'Liters']
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
      },
      {
        name: 'Camp / Distribution Location',
        key: 'camp_location',
        type: 'Text',
        required: false,
        placeholder: 'Community centre or relief camp'
      }
    ]
  },
  {
    name: 'Donation & Grant',
    slug: 'donation-grant',
    prefix: 'DON',
    icon: 'Receipt',
    description: 'Indian funding sources, CSR grants, institutional foundations, and 80G tax exemption receipts.',
    isPredefined: true,
    fields: [
      {
        name: 'Donor / Grantor Name',
        key: 'donor_name',
        type: 'Text',
        required: true,
        placeholder: 'Individual, CSR entity, or Foundation'
      },
      {
        name: 'Donor Classification',
        key: 'donor_type',
        type: 'Dropdown',
        required: true,
        options: [
          'Individual Indian Donor',
          'Corporate CSR Grant (India)',
          'Institutional Foundation',
          'Foreign Contribution (FCRA Approved)',
          'Government Grant'
        ]
      },
      {
        name: 'Funding Amount (INR)',
        key: 'amount',
        type: 'Currency',
        required: true,
        placeholder: '50000'
      },
      {
        name: 'Designated Programme',
        key: 'project_tag',
        type: 'Text',
        required: false,
        placeholder: 'e.g. Rural Healthcare Initiative'
      },
      {
        name: '80G Tax Exemption Issued',
        key: 'tax_exemption_issued',
        type: 'Checkbox',
        required: false
      },
      {
        name: '80G Receipt Reference',
        key: 'receipt_id',
        type: 'Text',
        required: false,
        placeholder: '80G-2026-XXXX'
      },
      {
        name: 'Donor PAN',
        key: 'donor_pan',
        type: 'Text',
        required: false,
        placeholder: 'ABCDE1234F (For 10BD CSR filing)'
      }
    ]
  },
  {
    name: 'Volunteer & Staff',
    slug: 'volunteer-staff',
    prefix: 'VOL',
    icon: 'Briefcase',
    description: 'Field workers, social caseworkers, medical camp volunteers, and disaster response staff.',
    isPredefined: true,
    fields: [
      {
        name: 'Full Name',
        key: 'full_name',
        type: 'Text',
        required: true,
        placeholder: 'e.g. Aarav Sharma'
      },
      {
        name: 'Deployment Role',
        key: 'role',
        type: 'Dropdown',
        required: true,
        options: [
          'Field Caseworker',
          'Emergency Medic',
          'Logistics Coordinator',
          'Counselor / Social Worker',
          'Community Volunteer'
        ]
      },
      {
        name: 'Primary Contact Mobile',
        key: 'phone',
        type: 'Phone',
        required: true,
        placeholder: '+91 98765 43210'
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
        name: 'Assigned State / District',
        key: 'assigned_zone',
        type: 'Text',
        required: false,
        placeholder: 'District or field base'
      }
    ]
  }
];

module.exports = { PREDEFINED_RECORD_TYPES };
