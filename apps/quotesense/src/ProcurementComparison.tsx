import { Panel, StatusChip, Notice, Button } from "@portfolio/ui";
import {
  asRecords,
  getAnalysisView,
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
  const analysisView = getAnalysisView(result);
  const scoreRows = [
    { label: "Cost", key: "cost_score", weight: "cost" },
    { label: "Completeness", key: "completeness_score", weight: "completeness" },
    { label: "Timeline", key: "timeline_score", weight: "timeline" },
    { label: "Terms", key: "terms_score", weight: "terms" },
    { label: "Risk", key: "risk_score", weight: "risk" },
  ] as const;
  const scoreMap = new Map(analysisView.scores.map((score) => [
    String(score.supplier || "").trim().toLowerCase(),
    score,
  ]));
  const formatComponent = (value: unknown) => {
    const score = scoreNumber(value);
    return score === null ? "Not scored" : `${score.toFixed(1)} / 100`;
  };
  const formatWeight = (value: unknown) => {
    const weight = scoreNumber(value);
    return weight === null ? "—" : `${(weight * 100).toFixed(0)}%`;
  };

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

      {result.market ? (() => {
        const market = result.market as QuoteRecord;
        const insight = typeof market.insights === "object" && market.insights !== null && !Array.isArray(market.insights)
          ? market.insights as QuoteRecord
          : {};
        const results = asRecords(insight.results);
        const providerUnavailable = insight.status === "unavailable";
        return <Panel
          title="Optional market context"
          detail="External category-level research. These sources are contextual references, not verified supplier quotations or a substitute for the bid documents."
        >
          {providerUnavailable ? <Notice tone="info">{String(insight.message || "External market search is not available. The supplier comparison has still completed.")}</Notice> : null}
          {results.length ? <div className="market-source-list">{results.map((item, index) => {
            let href = "";
            try {
              const candidate = new URL(String(item.url || ""));
              if (candidate.protocol === "https:" || candidate.protocol === "http:") href = candidate.toString();
            } catch { /* Ignore malformed third-party source URLs. */ }
            return <article className="market-source" key={`market-${index}`}>
              <div><strong>{String(item.title || `Source ${index + 1}`)}</strong><p>{String(item.content || item.snippet || "No source excerpt returned.")}</p></div>
              {href ? <a href={href} target="_blank" rel="noreferrer">Open source ↗</a> : null}
            </article>;
          })}</div> : !providerUnavailable ? <Notice tone="info">No market context sources were returned for this category.</Notice> : null}
          {market.query ? <p className="comparison-footnote">Search scope: {String(market.query)}</p> : null}
        </Panel>;
      })() : null}

      <Panel
        title="Weighted decision scorecard"
        detail="See which scoring dimensions drive each supplier's deterministic rank. Weights are normalized by the backend."
      >
        <div className="comparison-table-scroll">
          <table className="data-table comparison-matrix">
            <thead><tr>
              <th>Scoring factor</th>
              {suppliers.map((supplier, index) => <th key={`score-head-${String(supplier.supplier)}-${index}`}>
                <strong>{String(supplier.supplier || `Supplier ${index + 1}`)}</strong>
                <small>Overall {formatComponent(scoreMap.get(String(supplier.supplier || "").trim().toLowerCase())?.score)}</small>
              </th>)}
            </tr></thead>
            <tbody>
              {scoreRows.map((row) => <tr key={row.key}>
                <th scope="row">{row.label}<small>Weight {formatWeight(analysisView.weights[row.weight])}</small></th>
                {suppliers.map((supplier, index) => {
                  const score = scoreMap.get(String(supplier.supplier || "").trim().toLowerCase());
                  return <td key={`score-${row.key}-${index}`}>{formatComponent(score?.[row.key])}</td>;
                })}
              </tr>)}
            </tbody>
          </table>
        </div>
        <p className="comparison-footnote">A missing or incomparable component is omitted and the remaining available weights are re-normalized. Check the validation and source evidence before treating a small score difference as meaningful.</p>
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
