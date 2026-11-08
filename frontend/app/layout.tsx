import Link from 'next/link';
import type { ReactNode } from 'react'

// import {Libertinus_Sans} from 'next/font/google'

// const Libertinus = Libertinus_Sans({
//   subsets: ['latin'],
//   weight: ['400', '700'],
//   display: 'swap',
// })

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title >My Next Js App</title>
      </head>
      <body>
        <header>
          <h2>Header</h2>
        </header>
        <main>
          {children}
        </main>
        <footer>
          <h4>Footer</h4>
          <p>Developed by Romiz Khan</p>
        </footer>
      </body>
    </html>
  );
}