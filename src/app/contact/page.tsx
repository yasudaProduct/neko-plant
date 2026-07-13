import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "猫と植物へのお問い合わせフォームです。ご意見・ご要望をお寄せください。",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="container mx-auto mt-10 mb-10">
      <Card>
        <CardContent>
          <iframe
            src="https://confirmed-giant-27d.notion.site/ebd/1c69f17f06688007995fc3497043f841"
            width="100%"
            height="1280"
            allowFullScreen
          />
        </CardContent>
      </Card>
    </div>
  );
}
