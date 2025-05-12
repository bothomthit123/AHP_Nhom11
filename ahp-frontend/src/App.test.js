import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Hệ thống hỗ trợ ra quyết định tìm địa điểm du lịch/i);
  expect(headerElement).toBeInTheDocument();
});
