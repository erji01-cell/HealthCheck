const PAGE_SIZE = 10;

const formatVisitDate = (value) => {
  const match = String(value || '').match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!match) return '';
  return `${Number(match[1])}月${Number(match[2])}日`;
};

const formatExamType = (purpose) => {
  if (purpose === '特定健診(国保)') return '特定';
  if (purpose === '長寿健診') return '長寿';
  return purpose || '';
};

const buildRosterPages = (reservations) => {
  const groups = new Map();
  reservations.forEach((reservation) => {
    const companyKey = reservation.company_id || reservation.company_name || '__no_company__';
    if (!groups.has(companyKey)) groups.set(companyKey, []);
    groups.get(companyKey).push(reservation);
  });

  return [...groups.entries()]
    .sort(([, a], [, b]) => String(a[0]?.company_name || '').localeCompare(String(b[0]?.company_name || ''), 'ja'))
    .flatMap(([companyKey, rows]) => {
      const pageCount = Math.ceil(rows.length / PAGE_SIZE);
      return Array.from({ length: pageCount }, (_, pageIndex) => {
        const pageRows = rows.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);
        return {
          key: `${companyKey}-${pageIndex}`,
          companyName: rows[0]?.company_name || '団体名なし',
          pageIndex,
          pageCount,
          totalCount: rows.length,
          rows: [
            ...pageRows,
            ...Array.from({ length: PAGE_SIZE - pageRows.length }, () => null),
          ],
        };
      });
    });
};

export default function SpecificHealthRoster({ reservations, formatBirthDate }) {
  const pages = buildRosterPages(reservations);

  return (
    <div className="specific-health-roster-print-root hidden bg-white text-black">
      {pages.map((page, pageNumber) => (
        <section
          key={page.key}
          className="specific-health-roster-page"
          style={{ breakAfter: pageNumber === pages.length - 1 ? 'auto' : 'page' }}
        >
          <header className="specific-health-roster-header">
            <div>
              <h1>特定健診受診者名簿</h1>
              <div className="specific-health-roster-company">{page.companyName}</div>
            </div>
            <div className="specific-health-roster-provider">医療機関名　陽春堂内科診療所</div>
          </header>

          <table className="specific-health-roster-table">
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>No</th>
                <th>受診日</th>
                <th>保険証番号</th>
                <th>氏名</th>
                <th>生年月日</th>
                <th>性別</th>
                <th>健診種別</th>
                <th>特定健診結果（階層化）</th>
                <th>備考</th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((reservation, rowIndex) => {
                const rosterNumber = page.pageIndex * PAGE_SIZE + rowIndex + 1;
                return (
                  <tr key={reservation?.id || `${page.key}-blank-${rowIndex}`}>
                    <td className="text-center">{rosterNumber}</td>
                    <td className="text-center">{reservation ? formatVisitDate(reservation.date) : ''}</td>
                    <td>&nbsp;</td>
                    <td>{reservation?.patient_name || ''}</td>
                    <td className="specific-health-roster-birth">
                      {reservation?.birth_date ? formatBirthDate(reservation.birth_date) : ''}
                    </td>
                    <td className="text-center">{reservation?.patient_gender || ''}</td>
                    <td className="specific-health-roster-purpose">
                      {reservation ? formatExamType(reservation.purpose) : ''}
                    </td>
                    <td className="specific-health-roster-result-entry">情報・動機・積極</td>
                    <td className="specific-health-roster-note-entry">紹介状（有・無）</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <footer className="specific-health-roster-footer">
            <div>合計　{page.totalCount} 人</div>
            <div>{page.pageCount > 1 ? `${page.pageIndex + 1} / ${page.pageCount}` : ''}</div>
          </footer>
        </section>
      ))}
    </div>
  );
}
