
-- =====================================================
-- GLOBAL SUPERSTORE
-- Business Performance & Profitability Analysis
-- =====================================================

-- 01. DATA QUALITY
-- Verify imported row count and unique identifiers

SELECT
    COUNT(*) AS total_rows,
    COUNT(DISTINCT "Row ID") AS unique_row_ids,
    COUNT(DISTINCT "Order ID") AS unique_order_ids
FROM public.orders;


-- 02. CATEGORY PROFITABILITY
-- Which categories generate the highest profits?

SELECT
    "Category",
    ROUND(SUM("Sales"), 2) AS total_sales,
    ROUND(SUM("Profit"), 2) AS total_profit,
    ROUND(
        100 * SUM("Profit") / NULLIF(SUM("Sales"), 0),
        2
    ) AS profit_margin_pct
FROM public.orders
GROUP BY "Category"
ORDER BY total_profit DESC;


-- 03. FURNITURE SUBCATEGORY ANALYSIS
-- Which Furniture subcategories are loss-making?

SELECT
    "Sub-Category",
    COUNT(*) AS sales_lines,
    ROUND(SUM("Sales"), 2) AS total_sales,
    ROUND(SUM("Profit"), 2) AS total_profit,
    ROUND(
        100 * SUM("Profit") / NULLIF(SUM("Sales"), 0),
        2
    ) AS profit_margin_pct
FROM public.orders
WHERE "Category" = 'Furniture'
GROUP BY "Sub-Category"
ORDER BY profit_margin_pct ASC;


-- 04. TABLES DISCOUNT ANALYSIS
-- How does profitability vary by discount level?

SELECT
    "Discount",
    COUNT(*) AS sales_lines,
    ROUND(SUM("Sales"), 2) AS total_sales,
    ROUND(SUM("Profit"), 2) AS total_profit,
    ROUND(
        100 * SUM("Profit") / NULLIF(SUM("Sales"), 0),
        2
    ) AS profit_margin_pct
FROM public.orders
WHERE "Sub-Category" = 'Tables'
GROUP BY "Discount"
ORDER BY "Discount";


-- 05. GEOGRAPHIC PROFITABILITY
-- Which markets generate losses in Tables?

SELECT
    "Market",
    COUNT(*) AS sales_lines,
    ROUND(100 * AVG("Discount"), 2)
        AS avg_discount_pct,
    ROUND(SUM("Sales"), 2) AS total_sales,
    ROUND(SUM("Profit"), 2) AS total_profit,
    ROUND(
        100 * SUM("Profit") / NULLIF(SUM("Sales"), 0),
        2
    ) AS profit_margin_pct
FROM public.orders
WHERE "Sub-Category" = 'Tables'
GROUP BY "Market"
ORDER BY total_profit ASC;


-- 06. MARKET AND DISCOUNT SEGMENTATION
-- Compare low and high discount profitability

SELECT
    "Market",
    CASE
        WHEN "Discount" < 0.30 THEN 'Below 30%'
        ELSE '30% or more'
    END AS discount_group,
    COUNT(*) AS sales_lines,
    ROUND(SUM("Sales"), 2) AS total_sales,
    ROUND(SUM("Profit"), 2) AS total_profit,
    ROUND(
        100 * SUM("Profit") / NULLIF(SUM("Sales"), 0),
        2
    ) AS profit_margin_pct
FROM public.orders
WHERE "Sub-Category" = 'Tables'
GROUP BY
    "Market",
    CASE
        WHEN "Discount" < 0.30 THEN 'Below 30%'
        ELSE '30% or more'
    END
ORDER BY "Market", discount_group;


-- 07. DISCOUNT GROUP SUMMARY
-- Quantify total profit by discount group

SELECT
    CASE
        WHEN "Discount" < 0.30 THEN 'Below 30%'
        ELSE '30% or more'
    END AS discount_group,
    COUNT(*) AS sales_lines,
    ROUND(SUM("Sales"), 2) AS total_sales,
    ROUND(SUM("Profit"), 2) AS total_profit,
    ROUND(
        100 * SUM("Profit") / NULLIF(SUM("Sales"), 0),
        2
    ) AS profit_margin_pct
FROM public.orders
WHERE "Sub-Category" = 'Tables'
GROUP BY
    CASE
        WHEN "Discount" < 0.30 THEN 'Below 30%'
        ELSE '30% or more'
    END
ORDER BY discount_group;


-- 08. IMPLIED COST ANALYSIS
-- Inspect high-discount sales lines

SELECT
    "Row ID",
    "Market",
    "Product ID",
    "Sales",
    "Discount",
    "Profit",
    ROUND("Sales" - "Profit", 2) AS implied_cost
FROM public.orders
WHERE "Sub-Category" = 'Tables'
  AND "Discount" >= 0.30
LIMIT 10;


-- 09. TOP LOSS-MAKING SALES LINES
-- Estimate pre-discount value and implied cost

SELECT
    "Row ID",
    "Market",
    "Product ID",
    ROUND("Sales", 2) AS actual_sales,
    "Discount",
    ROUND(
        "Sales" / NULLIF(1 - "Discount", 0),
        2
    ) AS estimated_list_price,
    ROUND("Sales" - "Profit", 2) AS implied_cost,
    ROUND("Profit", 2) AS actual_profit
FROM public.orders
WHERE "Sub-Category" = 'Tables'
ORDER BY "Profit" ASC
LIMIT 10;


-- 10. BREAK-EVEN DISCOUNT
-- Estimate discount at which implied profit is zero

WITH pricing_analysis AS (
    SELECT
        "Row ID",
        "Market",
        "Discount",
        "Sales",
        "Profit",
        "Sales" / NULLIF(1 - "Discount", 0)
            AS estimated_list_price,
        "Sales" - "Profit" AS implied_cost
    FROM public.orders
    WHERE "Sub-Category" = 'Tables'
)
SELECT
    "Row ID",
    "Market",
    ROUND(100 * "Discount", 2)
        AS actual_discount_pct,
    ROUND(
        100 * (
            1 - implied_cost /
            NULLIF(estimated_list_price, 0)
        ),
        2
    ) AS break_even_discount_pct,
    ROUND("Profit", 2) AS actual_profit
FROM pricing_analysis
ORDER BY actual_profit ASC
LIMIT 10;
-- =====================================================
-- 11. DATA QUALITY - DATE VALIDATION
-- Business question:
-- Are order dates correctly imported and consistent?
-- =====================================================

SELECT
    MIN("Order Date") AS first_order_date,
    MAX("Order Date") AS last_order_date,
    MIN("Ship Date") AS first_ship_date,
    MAX("Ship Date") AS last_ship_date
FROM public.orders;
-- 12. DATABASE CONNECTION CHECK

SELECT current_database();
-- 13. DATE DATA TYPES VALIDATION

SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name IN ('Order Date', 'Ship Date');
-- 14. CHECK DATE FORMAT

SELECT
    "Order Date",
    "Ship Date"
FROM public.orders
LIMIT 10;
-- 15. TEST DATE CONVERSION

SELECT
    "Order Date" AS original_order_date,
    TO_DATE("Order Date", 'MM/DD/YY') AS converted_order_date,
    "Ship Date" AS original_ship_date,
    TO_DATE("Ship Date", 'MM/DD/YY') AS converted_ship_date
FROM public.orders
LIMIT 10;
-- 16. CONVERT DATE COLUMNS TO DATE TYPE

ALTER TABLE public.orders
    ALTER COLUMN "Order Date" TYPE DATE
        USING TO_DATE("Order Date", 'MM/DD/YY'),
    ALTER COLUMN "Ship Date" TYPE DATE
        USING TO_DATE("Ship Date", 'MM/DD/YY');
-- 17. VALIDATE DATE RANGES

SELECT
    MIN("Order Date") AS first_order_date,
    MAX("Order Date") AS last_order_date,
    MIN("Ship Date") AS first_ship_date,
    MAX("Ship Date") AS last_ship_date,
    COUNT(*) AS total_rows
FROM public.orders;
-- 18. PRODUCT ID DATA QUALITY CHECK
-- Identify product IDs associated with multiple names

SELECT
    "Product ID",
    COUNT(DISTINCT "Product Name") AS product_names,
    COUNT(DISTINCT "Sub-Category") AS subcategories,
    COUNT(*) AS sales_lines
FROM public.orders
GROUP BY "Product ID"
HAVING COUNT(DISTINCT "Product Name") > 1
    OR COUNT(DISTINCT "Sub-Category") > 1
ORDER BY product_names DESC, sales_lines DESC;
-- 19. TABLES PRODUCT ID VALIDATION
-- Count ambiguous product identifiers in Tables

WITH product_check AS (
    SELECT
        "Product ID",
        COUNT(DISTINCT "Product Name") AS product_names
    FROM public.orders
    WHERE "Sub-Category" = 'Tables'
    GROUP BY "Product ID"
)
SELECT
    COUNT(*) AS total_product_ids,
    COUNT(*) FILTER (
        WHERE product_names > 1
    ) AS ambiguous_product_ids
FROM product_check;
-- 20. FINAL DATA EXPORT CHECK

SELECT
    COUNT(*) AS total_rows,
    ROUND(SUM("Sales"), 2) AS total_sales,
    ROUND(SUM("Profit"), 2) AS total_profit,
    MIN("Order Date") AS first_order,
    MAX("Order Date") AS last_order
FROM public.orders;