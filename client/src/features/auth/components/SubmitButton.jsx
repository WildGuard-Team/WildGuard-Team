export default function SubmitButton({ children, isLoading }) {
  return <button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? 'Please wait…' : children}</button>;
}
