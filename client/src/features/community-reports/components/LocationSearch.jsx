import { useEffect, useRef, useState } from 'react';
import { searchLocations } from '../services/locationApi.js';

export default function LocationSearch({ value, onChange, onSelect }) {
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const isMounted = useRef(true);
  const searchPending = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  async function search() {
    if (searchPending.current) return;
    const query = value.trim();
    if (query.length < 3) {
      setError('Enter at least 3 characters to search.');
      setResults([]);
      return;
    }
    searchPending.current = true;
    setIsSearching(true); setError('');
    try {
      const nextResults = await searchLocations(query);
      if (isMounted.current) {
        setResults(nextResults);
        if (!nextResults.length) setError('No matching locations were found. Try a nearby landmark or road.');
      }
    } catch (requestError) {
      if (isMounted.current) { setResults([]); setError(requestError.message); }
    } finally {
      searchPending.current = false;
      if (isMounted.current) setIsSearching(false);
    }
  }

  function choose(result) {
    onSelect(result, value.trim());
    setResults([]); setError('');
  }

  return <section className="location-search" aria-labelledby="manual-location-title">
    <div className="location-divider"><span>or</span></div>
    <h3 id="manual-location-title">Enter Location Manually</h3>
    <div role="search">
      <label className="sr-only" htmlFor="location-search">Village, road, landmark, or park area</label>
      <input id="location-search" value={value} onChange={(event) => { onChange(event.target.value); setError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void search(); } }} placeholder="Enter village, road, landmark, or park area" aria-describedby="location-search-status" />
      <button className="location-search-button" type="button" onClick={() => { void search(); }} disabled={isSearching}>{isSearching ? 'Searching…' : 'Search'}</button>
    </div>
    <div id="location-search-status" className="location-search-status" aria-live="polite">{error}</div>
    {results.length > 0 && <ul className="location-results" aria-label="Location search results">{results.map((result) => <li key={result.placeId}><button type="button" onClick={() => choose(result)}><strong>{result.displayName}</strong></button></li>)}</ul>}
  </section>;
}
