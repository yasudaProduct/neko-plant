import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-6 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <div className="flex justify-center gap-4 mb-4">
          <Avatar>
            <AvatarImage src="/placeholder.svg" alt="Leaf" />
            <AvatarFallback>
                </AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage src="/placeholder.svg" alt="Cat" />
            <AvatarFallback>
              <svg
                className="h-6 w-6"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 22c-1.5 0-2.9-.3-4.2-.9-1.3-.6-2.4-1.4-3.4-2.4-1-1-1.8-2.1-2.4-3.4C1.3 14 1 12.6 1 11c0-1.5.3-2.9.9-4.2.6-1.3 1.4-2.4 2.4-3.4 1-1 2.1-1.8 3.4-2.4C9 .3 10.4 0 12 0c1.5 0 2.9.3 4.2.9 1.3.6 2.4 1.4 3.4 2.4 1 1 1.8 2.1 2.4 3.4.6 1.3.9 2.7.9 4.2 0 1.5-.3 2.9-.9 4.2-.6 1.3-1.4 2.4-2.4 3.4-1 1-2.1 1.8-3.4 2.4-1.3.6-2.7.9-4.2.9zm0-2c2.2 0 4.1-.8 5.7-2.4C19.2 16 20 14.1 20 12c0-2.2-.8-4.1-2.3-5.7C16 4.8 14.1 4 12 4c-2.2 0-4.1.8-5.7 2.3C4.8 8 4 9.9 4 12c0 2.2.8 4.1 2.3 5.6C8 19.2 9.9 20 12 20z"/>
              </svg>
            </AvatarFallback>
          </Avatar>
        </div>
        <p className="text-sm text-primary-foreground/60">© 2024 ネコと植物の相性チェッカー</p>
      </div>
    </footer>
  )
}