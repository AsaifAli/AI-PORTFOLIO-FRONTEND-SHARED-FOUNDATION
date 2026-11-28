import { Panel, StatusChip, Notice, Button } from "@portfolio/ui";
import {
  asRecords,
  getProcurementComparison,
  scoreNumber,
  type QuoteAnalysis,
  type QuoteRecord,
} from "./data";

function displayAmount(value: unknown, currency: unknown): string {
  const amount = scoreNumber(value);
  if (amount === null) return "Not stated";
  return `${currency ? `${String(currency)} ` : ""}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function displayText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not stated";
  if (Array.isArray(value)) return value.length ? value.map(String).join("; ") : "None listed";
  return String(value);
}

function supplierValue(supplier: QuoteRecord, key: string): string {
  return displayText(supplier[key]);
}

export function ProcurementComparison({
  result,
  onExport,
}: {
  result: QuoteAnalysis;
  onExport: () => void;
}) {
  const comparison = getProcurementComparison(result);
  const suppliers = comparison.suppliers;
  const lineItems = comparison.lineItems;
  const pricing = comparison.pricing;

  const dimensions: Array<{ label: string; value: (supplier: QuoteRecord) => string }> = [
    { label: "Quoted total", value: (supplier) => displayAmount(supplier.total_cost, supplier.currency) },
    { label: "Difference from lowest", value: (supplier) => {
      if (!comparison.currencyComparable) return "Not comparable";
      const difference = scoreNumber(supplier.price_difference_from_lowest);
      if (difference === null) return "—";
      const percent = scoreNumber(supplier.percent_above_lowest);
      return difference === 0 ? "Lowest quoted total" : `+${displayAmount(difference, supplier.currency)}${percent === null ? "" : ` (${percent.toFixed(1)}%)`}`;
    } },
    { label: "Deterministic score", value: (supplier) => {
      const score = scoreNumber(supplier.score);
      return score === null ? "Not scored" : `${score.toFixed(1)} / 100`;
    } },
    { label: "Delivery timeline", value: (supplier) => supplierValue(supplier, "delivery_timeline") },
    { label: "Payment terms", value: (supplier) => supplierValue(supplier, "payment_terms") },
    { label: "Warranty", value: (supplier) => supplierValue(supplier, "warranty") },
    { label: "After-sales support", value: (supplier) => supplierValue(supplier, "support") },
    { label: "Quote validity", value: (supplier) => supplierValue(supplier, "validity_period") },
    { label: "Itemized rows", value: (supplier) => {
      const count = scoreNumber(supplier.line_item_count);
      return count === null ? "Not stated" : `${count} itemized ${count === 1 ? "row" : "rows"}`;
    } },
    { label: "Tax treatment", value: (supplier) => supplier.tax_included === true
      ? "Tax included"
      : supplier.tax_included === false
        ? "Tax additional / excluded"
        : scoreNumber(supplier.tax_amount) !== null
          ? `Tax amount stated: ${displayAmount(supplier.tax_amount, supplier.currency)}`
          : "Not stated" },
    { label: "Shipping / freight", value: (supplier) => displayAmount(supplier.shipping_cost, supplier.currency) },
    { label: "Discount", value: (supplier) => displayAmount(supplier.discount_amount, supplier.currency) },
    { label: "Other charges", value: (supplier) => displayAmount(supplier.additional_charges, supplier.currency) },
    { label: "Listed exclusions", value: (supplier) => supplierValue(supplier, "exclusions") },
    { label: "Source document", value: (supplier) => supplierValue(supplier, "source_document") },
  ];

  return (
    <div className="procurement-comparison-stack">
      <Panel
        title="Commercial comparison"
        detail="Compare supplier offers across price, delivery, payment, warranty, support and scope."
        actions={<Button variant="quiet" onClick={onExport}>Export detailed comparison ↓</Button>}
      >
        {comparison.currencyComparable ? (
          <div className="comparison-lowest">
            <div>
              <small>Lowest quoted total · {comparison.currency || "shared currency"}</small>
              <strong>{comparison.lowestPriceSupplier || "Supplier identified"}</strong>
            </div>
            <strong className="comparison-lowest-price">{displayAmount(comparison.lowestPrice, comparison.currency)}</strong>
          </div>
        ) : (
          <Notice tone="warning">{comparison.comparabilityReason} Quote totals are shown, but the application does not convert currencies or rank unlike currencies by price.</Notice>
        )}
        <div className="comparison-table-scroll">
          <table className="data-table comparison-matrix">
            <thead><tr>
              <th>Decision factor</th>
              {suppliers.map((supplier, index) => <th key={`${String(supplier.supplier)}-${index}`}>
                <strong>{String(supplier.supplier || `Supplier ${index + 1}`)}</strong>
                {supplier.source_document ? <small>{String(supplier.source_document)}</small> : null}
              </th>)}
            </tr></thead>
            <tbody>{dimensions.map((dimension) => <tr key={dimension.label}>
              <th scope="row">{dimension.label}</th>
              {suppliers.map((supplier, index) => <td key={`${dimension.label}-${String(supplier.supplier)}-${index}`}>{dimension.value(supplier)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        {suppliers.length < 2 ? <Notice tone="warning">Only one quotation was extracted. Upload another supplier quotation to make a meaningful comparison.</Notice> : null}
      </Panel>

      <Panel
        title="Itemized scope comparison"
        detail="Exact matching descriptions are aligned across suppliers. Similar but differently worded items are kept separate for human review."
      >
        {lineItems.length ? <>
          <div className="comparison-table-scroll">
            <table className="data-table comparison-matrix itemized-matrix">
              <thead><tr>
                <th>Extracted line item</th>
                {suppliers.map((supplier, index) => <th key={`line-head-${String(supplier.supplier)}-${index}`}>{String(supplier.supplier || `Supplier ${index + 1}`)}</th>)}
              </tr></thead>
              <tbody>{lineItems.map((group, rowIndex) => {
                const offers = asRecords(group.offers);
                return <tr key={`line-${String(group.description)}-${rowIndex}`}>
                  <th scope="row">{String(group.description || "Unlabelled item")}<small>{group.unit_price_comparable === true ? "Unit prices comparable" : "Unit prices not directly comparable"}</small></th>
                  {suppliers.map((supplier, supplierIndex) => {
                    const offer = offers.find((item) => String(item.supplier || "").toLowerCase() === String(supplier.supplier || "").toLowerCase());
                    return <td key={`offer-${rowIndex}-${supplierIndex}`}>
                      {offer ? <div className="line-offer">
                        <strong>{displayAmount(offer.unit_price, offer.currency)} <small>/ {String(offer.unit || "unit not stated")}</small></strong>
                        <span>Qty {displayText(offer.quantity)} · Line total {displayAmount(offer.total_price, offer.currency)}</span>
                        {offer.notes ? <small>{String(offer.notes)}</small> : null}
                      </div> : <span className="not-listed">Not listed</span>}
                    </td>;
                  })}
                </tr>;
              })}</tbody>
            </table>
          </div>
          <p className="comparison-footnote">“Not listed” means no matching extracted line item was found in that quotation. It does not prove that the supplier excludes the item. Descriptions are aligned only when their normalized wording matches exactly.</p>
        </> : <Notice tone="info">No itemized price rows were extracted from these documents. Supplier totals and commercial terms can still be compared, but the included scope should be checked against the original quotations.</Notice>}
      </Panel>

      <Panel
        title="Price breakdown & reconciliation"
        detail="Checks the stated subtotal, tax, freight, discounts and other charges against the quoted total when the source provides enough detail."
      >
        {pricing.length ? <div className="comparison-table-scroll">
          <table className="data-table comparison-matrix">
            <thead><tr><th>Pricing field</th>{pricing.map((item, index) => <th key={`price-head-${String(item.supplier)}-${index}`}>{String(item.supplier || `Supplier ${index + 1}`)}</th>)}</tr></thead>
            <tbody>
              {([
                ["Subtotal", "subtotal"],
                ["Tax", "tax_amount"],
                ["Shipping / freight", "shipping_cost"],
                ["Discount", "discount_amount"],
                ["Additional charges", "additional_charges"],
                ["Stated total", "stated_total"],
                ["Calculated from reported components", "calculated_total_from_reported_components"],
                ["Difference", "difference"],
              ] as const).map(([label, key]) => <tr key={key}>
                <th scope="row">{label}</th>{pricing.map((item, index) => <td key={`${key}-${index}`}>{displayAmount(item[key], item.currency)}</td>)}
              </tr>)}
              <tr><th scope="row">Reconciliation status</th>{pricing.map((item, index) => {
                const status = String(item.status || "insufficient_data");
                return <td key={`status-${index}`}><StatusChip label={status === "matched" ? "Matched" : status === "partial_check" ? "Partial check" : status === "review" ? "Review variance" : "Insufficient data"} tone={status === "matched" ? "good" : status === "review" ? "bad" : "warn"}/></td>;
              })}</tr>
            </tbody>
          </table>
        </div> : <Notice tone="info">No separate price breakdown was available in the extracted records. The stated quotation totals remain visible above; missing components are not assumed to be zero.</Notice>}
        <p className="comparison-footnote">A partial check uses only components explicitly extracted from the quotation. A missing tax, freight or discount field is not silently treated as zero.</p>
      </Panel>
    </div>
  );
}
