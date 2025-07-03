# XML/CSV Processor Documentation

## Overview
This document provides a comprehensive mapping of XML/CSV files to database tables for the C4C XML Processor system.

## Database Tables
The system uses the following 14 database tables:

1. **stores** - Store location and information
2. **departments** - Product departments with special classifications
3. **sales_transaction** - Transaction header data
4. **transaction_line_item** - Individual transaction items
5. **pos_device_terminal** - POS terminals and fuel dispensers
6. **payment** - Payment method details
7. **transaction_line_item_tax** - Tax information per line item
8. **promotions_line_item** - Promotion applications
9. **promotions_program_details** - Promotion program definitions
10. **rebate_program_details** - Rebate program definitions
11. **transaction_loyalty** - Transaction-level loyalty data
12. **loyalty_line_items** - Line-item loyalty details
13. **pricebook** - Product catalog and pricing
14. **transaction_event_log** - System events and logs

## Processor Mappings

### 1. CPJ Processor (Customer Point of Sale Journal)
**File Type:** CPJ XML files  
**Purpose:** Process transaction data from POS systems  
**Transaction Filtering:** Only processes "network sale" and "sale" transaction types

| XML Elements | Database Table | Fields Updated |
|--------------|----------------|----------------|
| `<store>`, `<storeid>`, `<location>` | stores | store_id, store_name, address, city, state, zip_code |
| `<transaction>`, `<trans>`, `<receipt>` | sales_transaction | transaction_id, store_id, pos_device_terminal_id, transaction_date_time, transaction_type, total_amount, tax_amount, discount_amount, tender_amount |
| `<lineitem>`, `<item>`, `<product>` | transaction_line_item | line_item_id, transaction_id, upc_id, quantity, unit_price, extended_price, discount_amount |
| `<terminal>`, `<pos>`, `<register>` | pos_device_terminal | pos_device_terminal_id, store_id, terminal_name, terminal_type, is_active |
| `<payment>`, `<tender>`, `<cash>`, `<credit>`, `<debit>` | payment | payment_id, transaction_id, payment_type, payment_amount, payment_method, authorization_code |
| `<tax>`, `<taxline>` | transaction_line_item_tax | tax_id, line_item_id, tax_type, tax_rate, tax_amount |
| `<promotion>`, `<discount>`, `<coupon>` | promotions_line_item | promotion_line_item_id, line_item_id, promotion_id, discount_amount |
| `<loyalty>`, `<reward>`, `<member>` | transaction_loyalty | loyalty_transaction_uuid, transaction_id, loyalty_account_number, loyalty_auto_discount, loyalty_earned_points, loyalty_redeemed_points |
| `<department>`, `<dept>` | departments | department_id, department_name, department_type, is_car_wash_department, is_fuel_department, is_lottery_department |
| `<upc>`, `<product>`, `<item>` | pricebook | upc_id, department_id, upc_description, cost, retail_price |
| `<event>`, `<log>`, `<activity>` | transaction_event_log | event_id, transaction_id, event_type, event_timestamp, event_data |

### 2. FCF Processor (Fuel Control File)
**File Type:** FCF XML files  
**Purpose:** Process fuel-related data and transactions

| XML Elements | Database Table | Fields Updated |
|--------------|----------------|----------------|
| `<store>`, `<site>`, `<location>` | stores | store_id, store_name, address, city, state, zip_code |
| `<fuel>`, `<grade>`, `<product>` | departments | department_id, department_name, department_type, is_fuel_department=true |
| `<grade>`, `<fueltype>`, `<product>` | pricebook | upc_id, department_id (fuel dept), upc_description, cost, retail_price |
| `<dispenser>`, `<pump>`, `<terminal>` | pos_device_terminal | pos_device_terminal_id, store_id, terminal_name="Dispenser X", terminal_type="fuel_dispenser", is_active=true |
| `<transaction>`, `<sale>`, `<fueling>` | sales_transaction | transaction_id, store_id, pos_device_terminal_id, transaction_date_time, transaction_type="fuel_sale", total_amount, tax_amount |
| `<fuelitem>`, `<grade>`, `<gallons>` | transaction_line_item | line_item_id, transaction_id, upc_id (fuel grade), quantity (gallons), unit_price (price per gallon), extended_price |
| `<inventory>`, `<tank>`, `<level>` | transaction_event_log | event_type="fuel_inventory", event_data (tank levels, deliveries) |

### 3. SUM Processor (Summary/Master Data)
**File Type:** SUM XML files  
**Purpose:** Process master data and summary information

| XML Elements | Database Table | Fields Updated |
|--------------|----------------|----------------|
| `<store>`, `<location>`, `<site>` | stores | store_id, store_name, address, city, state, zip_code |
| `<department>`, `<dept>`, `<category>` | departments | department_id, department_name, department_type, is_car_wash_department, is_fuel_department, is_lottery_department |
| `<product>`, `<item>`, `<upc>` | pricebook | upc_id, department_id, upc_description, cost, retail_price |
| `<rebate>`, `<cashback>`, `<program>` | rebate_program_details | rebate_id, rebate_name, rebate_type, rebate_amount, rebate_percentage, start_date, end_date, is_active, program_description |
| `<promotion>`, `<promo>`, `<discount>` | promotions_program_details | promotion_id, promotion_name, promotion_type, discount_amount, discount_percentage, start_date, end_date, is_active, promotion_description |
| `<loyalty>`, `<reward>`, `<member>` | loyalty_line_items | loyalty_line_item_id, transaction_id, loyalty_program_id, points_earned, points_redeemed, discount_amount |
| `<terminal>`, `<pos>`, `<register>` | pos_device_terminal | pos_device_terminal_id, store_id, terminal_name, terminal_type, is_active |
| `<summary>`, `<totals>`, `<stats>` | transaction_event_log | event_type="summary_data", event_data (JSON with summary statistics) |

### 4. Generic Processor (Multi-Format)
**File Types:** FGM, HRS, ISM, LYT, MCM, MSM, TPM XML files  
**Purpose:** Handle various XML formats with pattern recognition

| File Type | XML Elements | Database Table | Purpose |
|-----------|--------------|----------------|---------|
| FGM | `<grade>`, `<fuel>`, `<fueltype>` | departments, pricebook | Fuel grade master data |
| HRS | `<hours>`, `<shift>`, `<schedule>` | transaction_event_log | Employee hours/schedules |
| ISM | `<inventory>`, `<stock>`, `<level>` | transaction_event_log | Inventory management |
| LYT | `<loyalty>`, `<reward>`, `<member>` | loyalty_line_items | Loyalty programs |
| MCM | `<category>`, `<merchandise>` | departments, pricebook | Merchandise categories |
| MSM | `<store>`, `<merchandise>` | stores, pricebook | Store/merchandise master |
| TPM | `<transaction>`, `<processing>` | promotions_program_details, rebate_program_details | Transaction processing master |

**Common Pattern Recognition:**
- Store elements: `<store>`, `<storeid>`, `<location>`, `<site>`
- Department elements: `<department>`, `<dept>`, `<category>`, `<section>`
- Product elements: `<product>`, `<item>`, `<upc>`, `<sku>`, `<plu>`
- Promotion elements: `<promotion>`, `<promo>`, `<discount>`, `<offer>`
- Rebate elements: `<rebate>`, `<cashback>`, `<refund>`
- Loyalty elements: `<loyalty>`, `<reward>`, `<member>`

### 5. Pricebook Processor (CSV)
**File Type:** Pricebook CSV files  
**Purpose:** Process product catalog and pricing data

| CSV Columns | Database Table | Fields Updated |
|-------------|----------------|----------------|
| UPC, Item Description, Cost, Retail Price | pricebook | upc_id, upc_description, cost, retail_price |
| Department ID, Department Name, Department Type | departments | department_id, department_name, department_type, is_car_wash_department, is_fuel_department, is_lottery_department |

**CSV Column Mapping (case-insensitive):**
- "UPC" or "upc" → upc_id (normalized)
- "Item Description" or "description" → upc_description
- "Department ID" or "department_id" → department_id
- "Department Name" or "department_name" → department_name
- "Department Type" or "department_type" → department_type
- "Cost" or "cost" → cost (parsed as decimal)
- "Retail Price" or "retail_price" → retail_price (parsed as decimal)

## Department Classification

All processors automatically classify departments based on name and type patterns:

### Car Wash Departments
**Keywords:** car wash, carwash, wash, vehicle wash, auto wash  
**Flag:** `is_car_wash_department = true`

### Fuel Departments
**Keywords:** fuel, gas, gasoline, diesel, petroleum, pump, dispenser, unleaded, premium, regular, e85, ethanol  
**Types:** fuel, gasoline, petroleum  
**Flag:** `is_fuel_department = true`

### Lottery Departments
**Keywords:** lottery, lotto, instant, scratch, powerball, mega millions, pick 3, pick 4, keno, scratch off, instant win  
**Types:** lottery, gaming  
**Flag:** `is_lottery_department = true`

## Processing Flow

### General Processing Steps
1. **File Detection** - Determine file type (CPJ, FCF, SUM, etc.)
2. **Parser Selection** - Route to appropriate processor
3. **Data Extraction** - Parse XML/CSV and extract relevant data
4. **Transaction Filtering** - CPJ files only process "network sale" and "sale" transaction types
5. **Reference Data Creation** - Create stores, departments, products as needed
6. **Department Classification** - Apply automatic classification rules
7. **Transaction Processing** - Create transaction and related records
8. **Error Handling** - Log errors and rollback on failures
9. **Result Reporting** - Return processing statistics

### Database Transaction Safety
- Each file processing uses database transactions
- Automatic rollback on errors
- Reference data created before dependent records
- Foreign key constraints maintained
- Duplicate handling (update existing records)

## API Endpoints

### Processing Endpoints
- `POST /api/process/upload` - Upload and process XML/CSV file
- `POST /api/process/file` - Process file from input directory
- `POST /api/process/batch` - Process multiple files
- `GET /api/process/files` - List available files
- `GET /api/process/status` - Get processor status

### Reporting Endpoints
- `GET /api/reports/transactions` - Transaction data with filters
- `GET /api/reports/promotions` - Promotion program data
- `GET /api/reports/summary` - Overall system summary
- `GET /api/reports/departments/statistics` - Department classification stats
- `POST /api/reports/departments/classify` - Classify all departments
- `POST /api/reports/departments/test-classification` - Test classification logic

## Error Handling

### Common Error Types
- **Invalid XML/CSV format** - Logged and skipped
- **Missing required fields** - Logged with details
- **Database constraint violations** - Handled gracefully
- **File access errors** - Proper error reporting
- **Data validation failures** - Detailed logging

### Recovery Mechanisms
- Transaction rollback on database errors
- Partial processing continuation where possible
- Comprehensive error logging for debugging
- Graceful degradation for non-critical failures

## Performance Considerations

### Optimization Features
- Bulk database operations where possible
- Transaction batching for large files
- Efficient XML/CSV parsing
- Connection pooling
- Index utilization for lookups

### Monitoring
- Processing time logging
- Record count tracking
- Error rate monitoring
- Database performance metrics

## Configuration

### Environment Variables
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `LOG_LEVEL` - Logging level

### File Processing Settings
- Maximum file size: 50MB
- Supported formats: XML, CSV
- Input directory: `../../input/`
- Log directory: `./logs/`

This documentation provides a complete reference for understanding how XML and CSV files are processed and mapped to database tables in the C4C XML Processor system. 