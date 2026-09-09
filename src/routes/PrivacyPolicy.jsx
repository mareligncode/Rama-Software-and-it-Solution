import { Nav } from '../components/site/Nav';
import { Footer } from '../components/site/Sections3';

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="section-pad">
        <div className="container-x max-w-4xl">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="mt-12 space-y-8">
            <section>
              <h2 className="font-display text-2xl font-bold">1. Information We Collect</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                We collect information you provide directly to us, such as when you create an account, contact us for services, or subscribe to our newsletter. This may include your name, email address, phone number, company information, and other details relevant to our services.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">2. How We Use Your Information</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                We use the information we collect to provide, maintain, and improve our services, communicate with you about our products and services, process transactions and send related information, and comply with legal obligations.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">3. Information Sharing</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                We do not sell your personal information. We may share your information with service providers who perform services on our behalf, with your consent, or as required by law. We take appropriate measures to ensure your personal information is protected.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">4. Data Security</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is completely secure.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">5. Your Rights</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                You have the right to access, correct, or delete your personal information. You may also opt out of marketing communications. To exercise these rights, please contact us at info@ramasoftware.com.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">6. Cookies and Tracking</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                We use cookies and similar technologies to improve your experience, analyze usage, and assist in our marketing efforts. You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">7. Changes to This Policy</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">8. Contact Us</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                If you have any questions about this privacy policy, please contact us at:
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <p><strong>Email:</strong> info@ramasoftware.com</p>
                <p><strong>Address:</strong> Bole Road, Addis Ababa, Ethiopia</p>
                <p><strong>Phone:</strong> +251 000 000 000</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default PrivacyPolicy;