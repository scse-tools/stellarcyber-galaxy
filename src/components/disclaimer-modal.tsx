"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  /** First-run presentation requires an explicit acknowledgement. */
  requireAck?: boolean;
  onAcknowledge: () => void;
  onClose: () => void;
}

/** Open-source / no-affiliation disclaimer, shown on first run and reachable from the header link. */
export function DisclaimerModal({ open, requireAck, onAcknowledge, onClose }: Props) {
  return (
    <Modal open={open} title="Disclaimer & Terms of Use" onClose={onClose} className="max-w-2xl">
      <div className="space-y-3 text-xs leading-relaxed text-sc-muted">
        <p>
          This application (&ldquo;Stellar Cyber Galaxy&rdquo;, the &ldquo;Software&rdquo;) is an independent,
          community-developed, open-source project. It is <strong className="text-sc-text">not</strong> authored,
          developed, endorsed, sponsored, maintained, supported by, or otherwise affiliated with Stellar Cyber, Inc.
          or any of its subsidiaries or affiliates (&ldquo;Stellar Cyber&rdquo;).
        </p>
        <p>
          &ldquo;Stellar Cyber&rdquo; and all related names, marks, logos, and product names are the property of their
          respective owners and are used herein solely for identification, interoperability, and nominative
          fair-use purposes. No sponsorship or endorsement is claimed or implied.
        </p>
        <p>
          THE SOFTWARE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;, WITHOUT WARRANTY OF ANY KIND,
          WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT LIMITATION THE IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
        </p>
        <p>
          You assume all responsibility and risk arising from your access to and use of the Software. TO THE MAXIMUM
          EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE AUTHORS, COPYRIGHT HOLDERS, OR CONTRIBUTORS BE
          LIABLE FOR ANY CLAIM, LOSS, OR DAMAGES OF ANY KIND (INCLUDING DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR EXEMPLARY DAMAGES), WHETHER IN CONTRACT, TORT, OR OTHERWISE, ARISING FROM OR IN
          CONNECTION WITH THE SOFTWARE OR ITS USE.
        </p>
        <p>
          By using this Software you acknowledge that you have read, understood, and agree to the foregoing, and that
          you use the Software entirely <strong className="text-sc-text">at your own risk</strong>.
        </p>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        {requireAck ? null : (
          <Button onClick={onClose}>Close</Button>
        )}
        <Button variant="primary" onClick={onAcknowledge}>
          I understand &amp; acknowledge
        </Button>
      </div>
    </Modal>
  );
}
