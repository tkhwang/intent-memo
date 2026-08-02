cask "intent-memo" do
  arch arm: "aarch64", intel: "x64"

  version "0.0.0"
  sha256 arm:   "0000000000000000000000000000000000000000000000000000000000000000",
         intel: "0000000000000000000000000000000000000000000000000000000000000000"

  url "https://github.com/tkhwang/intent-memo/releases/download/v#{version}/Intent%20Memo_#{version}_#{arch}.dmg"
  name "Intent Memo"
  desc "Markdown memo editor for human intentions"
  homepage "https://github.com/tkhwang/intent-memo"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true
  depends_on macos: ">= :high_sierra"

  app "Intent Memo.app"

  uninstall quit: "app.tkbetter.intentmemo"

  zap trash: [
    "~/Library/Application Support/app.tkbetter.intentmemo",
    "~/Library/Caches/app.tkbetter.intentmemo",
    "~/Library/HTTPStorages/app.tkbetter.intentmemo",
    "~/Library/Preferences/app.tkbetter.intentmemo.plist",
    "~/Library/WebKit/app.tkbetter.intentmemo",
  ]
end
